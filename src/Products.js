import BN from 'bn.js';
import Book from './Book.js';
import dexterity from '@hxronetwork/dexterity-ts';
import React from "react";
import EventQueue from './EventQueue.js';
import ProductButtons from './ProductButtons.js';
import Pubkey from './Pubkey.js';

import './Products.css';

const MAX_ASK = new BN(2).pow(new BN(63)).subn(1);
const MIN_BID = new BN(2).pow(new BN(63)).neg();
const ZERO_BN = new BN(0);

function getPriceStrings(p, quoteDecimals) { // p is a product.outright.outright or product.combo.combo
    const askPriceFrac = dexterity.Fractional.From(p.metadata.prices.ask);
    const bidPriceFrac = dexterity.Fractional.From(p.metadata.prices.bid);
    const bookPriceFrac = askPriceFrac.add(bidPriceFrac).div(dexterity.Fractional.New(2, 0));
    const isAskValid = !(askPriceFrac.m.eq(MAX_ASK) && askPriceFrac.exp.eq(ZERO_BN));
    const isBidValid = !(bidPriceFrac.m.eq(MIN_BID) && bidPriceFrac.exp.eq(ZERO_BN));
    let bidPrice, askPrice, bookPrice;
    if (isAskValid && isBidValid) {
        bidPrice = '$'+bidPriceFrac.toString(quoteDecimals, true);
        askPrice = '$'+askPriceFrac.toString(quoteDecimals, true);
        bookPrice = '$'+bookPriceFrac.toString(quoteDecimals, true);
    } else if (isAskValid) {
        bidPrice = 'No bid';
        askPrice = '$'+askPriceFrac.toString(quoteDecimals, true);
        bookPrice = '$'+askPriceFrac.toString(quoteDecimals, true) + ' (No bid)';
    } else if (isBidValid) {
        bidPrice = '$'+bidPriceFrac.toString(quoteDecimals, true);
        askPrice = 'No ask';
        bookPrice = '$'+bidPriceFrac.toString(quoteDecimals, true) + ' (No ask)';
    } else {
        bidPrice = 'No bid';
        askPrice = 'No ask';
        bookPrice = 'No bid or ask';
    }    
    const prevAskPriceFrac = dexterity.Fractional.From(p.metadata.prices.prevAsk);
    const prevBidPriceFrac = dexterity.Fractional.From(p.metadata.prices.prevBid);
    const prevAskPrice = (prevAskPriceFrac.m.eq(MAX_ASK) && prevAskPriceFrac.exp.eq(ZERO_BN))
          ? 'No prev. ask' : '$'+prevAskPriceFrac.toString(quoteDecimals, true);
    const prevBidPrice = (prevBidPriceFrac.m.eq(MIN_BID) && prevBidPriceFrac.exp.eq(ZERO_BN))
          ? 'No prev. bid' : '$'+prevBidPriceFrac.toString(quoteDecimals, true);
    return {
        askPrice,
        bidPrice,
        prevAskPrice,
        prevBidPrice,
        bookPrice,
    };
}

function parseMonth(month) {
    if (month === 'JAN') {
        return 0;
    } else if (month === 'FEB') {
        return 1;
    } else if (month === 'MAR') {
        return 2;
    } else if (month === 'APR') {
        return 3;
    } else if (month === 'MAY') {
        return 4;
    } else if (month === 'JUN') {
        return 5;
    } else if (month === 'JUL') {
        return 6;
    } else if (month === 'AUG') {
        return 7;
    } else if (month === 'SEP') {
        return 8;
    } else if (month === 'OCT') {
        return 9;
    } else if (month === 'NOV') {
        return 10;
    } else if (month === 'DEC') {
        return 11;
    }
    return NaN;
}

class Products extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isBookShown: {},
            isEventQueueShown: {},
            isProductInfoShown: {},
        };
    }
    render() {
        let products = [];
        if (this.props.mpg) {
            let stds = new Map();
            try {
                stds = this.props.manifest.getStds(this.props.mpg.pubkey);
            } catch (e) {
                console.error(e);
            }
            const ps = dexterity.Manifest.GetProductsOfMPG(this.props.mpg.mpg);
            let keys = Array.from(ps.keys());
            keys.sort((a, b) => {
                const aIsCombo = a.includes('COMBO');
                const bIsCombo = b.includes('COMBO');
                if (aIsCombo && bIsCombo) {
                    return a < b; // TODO could sort chronologically                                                                                                                                                  
                } else if (aIsCombo && !bIsCombo) {
                    return true;
                } else if (!aIsCombo && bIsCombo) {
                    return false;
                }
                const aIsPerp = a.includes('PERP');
                const bIsPerp = b.includes('PERP');
                if (aIsPerp && bIsPerp) {
                    return a < b; // this should never happen                                                                                                                                                         
                } else if (aIsPerp && !bIsPerp) {
                    return false;
                } else if (!aIsPerp && bIsPerp) {
                    return true;
                }
                a = a.slice('BTCUSD-'.length);
                b = b.slice('BTCUSD-'.length);
                const [aDay, aMonth, aYear] = a.split('-');
                const [bDay, bMonth, bYear] = b.split('-');
                const aDate = new Date(2000 + parseInt(aYear), parseMonth(aMonth), parseInt(aDay));
                const bDate = new Date(2000 + parseInt(bYear), parseMonth(bMonth), parseInt(bDay));
                return aDate >= bDate;
            });
            for (const productName of keys) {
                const { index, product } = ps.get(productName);
                let productStatus = 'Invalid';
                try {
                    productStatus = dexterity.productStatus(product, this.props.mpg.mpg.marketProducts.array);
                } catch (e) {
                    console.error('failed to get product status for', productName, product, this.props.mpg.mpg.marketProducts);
                    console.error(e);
                }
                if (product.hasOwnProperty('outright')) {
                    let p = product.outright.outright;
                    const quoteDecimals = dexterity.getPriceDecimals(p.metadata);
                    const productKey = p.metadata.productKey.toBase58();
                    const {
                        askPrice,
                        bidPrice,
                        prevAskPrice,
                        prevBidPrice,
                        bookPrice,
                    } = getPriceStrings(p, quoteDecimals);
                    const contractVolume = dexterity.Fractional.From(p.metadata.contractVolume).toString(quoteDecimals, true);
                    let std = '...';
                    for (const [k, v] of stds) {
                        if (k === productKey) {
                            std = v.toString(2, true);
                            break;
                        }
                    }
                    const orderbookStr = p.metadata.orderbook.toBase58();
                    const orderbook = this.props.mpg.orderbooks.get(orderbookStr);
                    let callerAuthorityStr;
                    let eventQueueKey;
                    let bidsStr;
                    let asksStr;
                    let minOrderSizeStr;
                    let tickSizeStr;
                    let feeBudgetStr;
                    let callbackIdLenStr;
                    let callBackInfoLenStr;
                    if (orderbook === null || orderbook === undefined) {
                        callerAuthorityStr = 'No orderbook';
                        eventQueueKey = 'No event queue';
                        bidsStr = 'No bids slab';
                        asksStr = 'No asks slab';
                        minOrderSizeStr = 'No orderbook';
                        tickSizeStr = 'No orderbook';
                        feeBudgetStr = 'No orderbook';
                        callbackIdLenStr = 'No orderbook';
                        callBackInfoLenStr = 'No orderbook';
                    } else {
                        callerAuthorityStr = orderbook.callerAuthority.toBase58();
                        eventQueueKey = orderbook.eventQueue.toBase58();
                        bidsStr = orderbook.bids.toBase58();
                        asksStr = orderbook.asks.toBase58();
                        minOrderSizeStr = orderbook.minOrderSize.toString();
                        tickSizeStr = orderbook.tickSize.toString();
                        feeBudgetStr = orderbook.feeBudget.toString();
                        callbackIdLenStr = orderbook.callBackIdLen.toString();
                        callBackInfoLenStr = orderbook.callBackInfoLen.toString();
                    }
                    products.push(
                        <div key={productKey} className="Product">
                            <div className="ProductTitle"><b>{productName}</b> {bookPrice}</div>
                            <div className="ProductVolume">Volume: ${contractVolume}</div>
                            <div className="ProductStd">Daily STD: ${std}</div>
                            <ProductButtons
                                isDetailsShown={this.state.isProductInfoShown[productKey]}
                                onDetailsButton={_ => {
                                    this.setState({
                                        ...this.state,
                                        isProductInfoShown: {
                                            ...this.state.isProductInfoShown,
                                            [productKey]: !this.state.isProductInfoShown[productKey],
                                        }
                                    });
                                }}
                                isBookShown={this.state.isBookShown[orderbookStr]}
                                onBookButton={_ => {
                                    const isShowBook = !this.state.isBookShown[orderbookStr];
                                    this.setState({
                                        ...this.state,
                                        isBookShown: {
                                            ...this.state.isBookShown,
                                            [orderbookStr]: isShowBook,
                                        }
                                    });
                                    if (isShowBook) {
                                        this.props.onStreamBooks(product);
                                    }
                                }}
                            />
                            {this.state.isBookShown[orderbookStr] && <Book book={this.props.books[productKey]} recordingState={this.props.bookRecordingStates[productKey]} onStartRecording={_ => { this.props.onStartRecordingBook(productKey) }} onStopRecording={_ => { this.props.onStopRecordingBook(productKey) }} />}
                            {this.state.isProductInfoShown[productKey] && 
                             <>
                                 <div className="ProductGrid">
                                     <div>Type</div><div>Outright</div>
                                     <div>Status</div><div>{productStatus}</div>
                                     <div>Ask</div><div>{askPrice}</div>
                                     <div>Bid</div><div>{bidPrice}</div>
                                     <div>Open Long Interest</div><div>{dexterity.Fractional.From(p.openLongInterest).toString()}</div>
                                     <div>Open Short Interest</div><div>{dexterity.Fractional.From(p.openShortInterest).toString()}</div>
                                     <div>Product Index</div><div>{index.toString()}</div>
                                     <div>Product Key</div><div><Pubkey pubkey={productKey} /></div>
                                     <div>Base Decimals</div><div>{p.metadata.baseDecimals.toString()}</div>
                                     <div>Tick Size</div><div>${dexterity.Fractional.From(p.metadata.tickSize).toString(quoteDecimals, true)}</div>
                                     <div>Cum. Funding Per Share</div>
                                     <div>${dexterity.Fractional.From(p.cumFundingPerShare).toString(quoteDecimals, true)}</div>
                                     <div>Cum. Social Loss Per Share</div>
                                     <div>${dexterity.Fractional.From(p.cumSocialLossPerShare).toString(quoteDecimals, true)}</div>
                                     <div>Price Offset</div><div>${dexterity.Fractional.From(p.metadata.priceOffset).toString(quoteDecimals, true)}</div>
                                     <div>Previous Ask</div><div>{prevAskPrice}</div>
                                     <div>Previous Bid</div><div>{prevBidPrice}</div>
                                     <div>Ask EMA</div><div>${dexterity.Fractional.From(p.metadata.prices.ewmaAsk).toString(quoteDecimals, true)}</div>
                                     <div>Bid EMA</div><div>${dexterity.Fractional.From(p.metadata.prices.ewmaBid).toString(quoteDecimals, true)}</div>
                                     <div>Prices Slot</div>
                                     <div><a
                                              href={"https://explorer.solana.com/block/" + p.metadata.prices.slot.toString()}
                                          >{p.metadata.prices.slot.toString()}</a></div>
                                     <div>Dust</div><div>{dexterity.Fractional.From(p.dust).toString(quoteDecimals, true)}</div>
                                     <div>Bump</div><div>{p.metadata.bump.toString()}</div>
                                     <div>Num. Q. Events (Not Used)</div><div>{p.numQueueEvents.toString()}</div>
                                     <div>Orderbook</div><div><Pubkey pubkey={orderbookStr} /></div>
                                     <div>Orderbook Caller Auth.</div><div><Pubkey pubkey={callerAuthorityStr} /></div>
                                     <div>Event Queue</div><div><Pubkey pubkey={eventQueueKey} /></div>
                                     <div>Bids Slab</div><div><Pubkey pubkey={bidsStr} /></div>
                                     <div>Asks Slab</div><div><Pubkey pubkey={asksStr} /></div>
                                     <div>AAOB Min. Order Size</div><div>{minOrderSizeStr}</div>
                                     <div>AAOB Tick Size</div><div>{tickSizeStr}</div>
                                     <div>AAOB Fee Budget</div><div>{feeBudgetStr}</div>
                                     <div>AAOB CallBack Id Len.</div><div>{callbackIdLenStr}</div>
                                     <div>AAOB CallBack Info Len.</div><div>{callBackInfoLenStr}</div>
                                 </div>
                                 {orderbook !== null &&
                                 <div className="ShowEventQueueWrapper">
                                     <button
                                         onClick={_ => {
                                             const isShowEventQueue = !this.state.isEventQueueShown[eventQueueKey];
                                             this.setState({
                                                 ...this.state,
                                                 isEventQueueShown: {
                                                     ...this.state.isEventQueueShown,
                                                     [eventQueueKey]: isShowEventQueue,
                                                 }
                                             });
                                             if (isShowEventQueue) {
                                                 this.props.onStreamEventQueue(
                                                     eventQueueKey,
                                                     orderbook.callBackInfoLen,
                                                     p.metadata.baseDecimals,
                                                     p.metadata.tickSize,
                                                     p.metadata.priceOffset,
                                                 );
                                             }
                                         }}>
                                         {this.state.isEventQueueShown[eventQueueKey] ?
                                          'Hide Event Queue' : 'Show Event Queue'}
                                     </button>
                                 </div>
                                 }
                                 {(orderbook !== null && this.state.isEventQueueShown[eventQueueKey]) &&
                                  <EventQueue eventQueue={this.props.eventQueues[eventQueueKey].eventQueue} />
                                 }
                             </>
                            }
                        </div>
                    );
                } else if (product.hasOwnProperty('combo')) {
                    let p = product.combo.combo;
                    const quoteDecimals = dexterity.getPriceDecimals(p.metadata);
                    const productKey = p.metadata.productKey.toBase58();
                    const {
                        askPrice,
                        bidPrice,
                        prevAskPrice,
                        prevBidPrice,
                        bookPrice,
                    } = getPriceStrings(p, quoteDecimals);
                    const contractVolume = dexterity.Fractional.From(p.metadata.contractVolume).toString(quoteDecimals, true);
                    const orderbookStr = p.metadata.orderbook.toBase58();
                    const orderbook = this.props.mpg.orderbooks.get(orderbookStr);
                    let callerAuthorityStr;
                    let eventQueueKey;
                    let bidsStr;
                    let asksStr;
                    let minOrderSizeStr;
                    let tickSizeStr;
                    let feeBudgetStr;
                    let callbackIdLenStr;
                    let callBackInfoLenStr;
                    if (orderbook === null || orderbook === undefined) {
                        callerAuthorityStr = 'No orderbook';
                        eventQueueKey = 'No event queue';
                        bidsStr = 'No bids slab';
                        asksStr = 'No asks slab';
                        minOrderSizeStr = 'No orderbook';
                        tickSizeStr = 'No orderbook';
                        feeBudgetStr = 'No orderbook';
                        callbackIdLenStr = 'No orderbook';
                        callBackInfoLenStr = 'No orderbook';
                    } else {
                        callerAuthorityStr = orderbook.callerAuthority.toBase58();
                        eventQueueKey = orderbook.eventQueue.toBase58();
                        bidsStr = orderbook.bids.toBase58();
                        asksStr = orderbook.asks.toBase58();
                        minOrderSizeStr = orderbook.minOrderSize.toString();
                        tickSizeStr = orderbook.tickSize.toString();
                        feeBudgetStr = orderbook.feeBudget.toString();
                        callbackIdLenStr = orderbook.callBackIdLen.toString();
                        callBackInfoLenStr = orderbook.callBackInfoLen.toString();
                    }
                    products.push(
                        <div key={productKey} className="Product">
                            <div className="ProductTitle"><b>{productName}</b> {bookPrice}</div>
                            <div className="ProductVolume">All-Time Volume: ${contractVolume}</div>
                            <ProductButtons
                                isDetailsShown={this.state.isProductInfoShown[productKey]}
                                onDetailsButton={_ => {
                                    this.setState({
                                        ...this.state,
                                        isProductInfoShown: {
                                            ...this.state.isProductInfoShown,
                                            [productKey]: !this.state.isProductInfoShown[productKey],
                                        }
                                    });
                                }}
                                isBookShown={this.state.isBookShown[orderbookStr]}
                                onBookButton={_ => {
                                    this.setState({
                                        ...this.state,
                                        isBookShown: {
                                            ...this.state.isBookShown,
                                            [orderbookStr]: !this.state.isBookShown[orderbookStr],
                                        }
                                    });
                                }}
                            />
                            {this.state.isProductInfoShown[productKey] && 
                             <div className="ProductGrid">
                                 <div>Type</div><div>Combo</div>
                                 <div>Status</div><div>{productStatus}</div>
                                 <div>Ask</div><div>{askPrice}</div>
                                 <div>Bid</div><div>{bidPrice}</div>
                                 <div>Product Index</div><div>{index.toString()}</div>
                                 <div>Product Key</div><div><Pubkey pubkey={productKey} /></div>
                                 <div>Base Decimals</div><div>{p.metadata.baseDecimals.toString()}</div>
                                 <div>Tick Size</div><div>${dexterity.Fractional.From(p.metadata.tickSize).toString(quoteDecimals, true)}</div>
                                 <div>Price Offset</div><div>${dexterity.Fractional.From(p.metadata.priceOffset).toString(quoteDecimals, true)}</div>
                                 <div>Previous Ask</div><div>{prevAskPrice}</div>
                                 <div>Previous Bid</div><div>{prevBidPrice}</div>
                                 <div>Ask EMA</div><div>${dexterity.Fractional.From(p.metadata.prices.ewmaAsk).toString(quoteDecimals, true)}</div>
                                 <div>Bid EMA</div><div>${dexterity.Fractional.From(p.metadata.prices.ewmaBid).toString(quoteDecimals, true)}</div>
                                 <div>Prices Slot</div>
                                 <div><a
                                          href={"https://explorer.solana.com/block/" + p.metadata.prices.slot.toString()}
                                      >{p.metadata.prices.slot.toString()}</a></div>
                                 <div>Bump</div><div>{p.metadata.bump.toString()}</div>
                                 <div>Orderbook</div><div><Pubkey pubkey={orderbookStr} /></div>
                                 <div>Orderbook Caller Auth.</div><div><Pubkey pubkey={callerAuthorityStr} /></div>
                                 <div>Event Queue</div><div><Pubkey pubkey={eventQueueKey} /></div>
                                 <div>Bids Slab</div><div><Pubkey pubkey={bidsStr} /></div>
                                 <div>Asks Slab</div><div><Pubkey pubkey={asksStr} /></div>
                                 <div>AAOB Min. Order Size</div><div>{minOrderSizeStr}</div>
                                 <div>AAOB Tick Size</div><div>{tickSizeStr}</div>
                                 <div>AAOB Fee Budget</div><div>{feeBudgetStr}</div>
                                 <div>AAOB CallBack Id Len.</div><div>{callbackIdLenStr}</div>
                                 <div>AAOB CallBack Info Len.</div><div>{callBackInfoLenStr}</div>
                             </div>
                            }
                        </div>
                    );
                } else {
                    products.push(
                        <div key={index.toString()} className="Product">
                            <div className="ProductTitle">{productName}</div>
                            <div className="ProductUnrecognized">(Unrecognized Product)</div>
                        </div>
                    );
                }
            }
        }
        return (
            <div className="Products">
                <div className="ProductsTitle"></div>
                <div className="ProductsList">
                    {products.length > 0 ? products : 'This MPG has no products!'}
                </div>
            </div>
        );
    }
}

export default Products;
