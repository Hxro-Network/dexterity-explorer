import BN from 'bn.js';
import { EventFill, EventQueue as AaobEventQueue, EventQueueHeader } from '@bonfida/aaob';
import { EVENT_TYPE_FILL, EVENT_TYPE_OUT } from './constants.js';
import dexterity from '@hxronetwork/dexterity-ts';
import * as solana from '@solana/web3.js';
import React from "react";
import Header from './Header.js';
import MPG from './MPG.js';
import TRGBrowser from './TRGBrowser.js';

Object.defineProperty(EventQueueHeader, 'LEN', {
    configurable: true,
    writable: true,
    value: 33
});

import './ExploreDexterity.css';

const MAX_ASK = new BN(2).pow(new BN(63)).subn(1);
const MIN_BID = new BN(2).pow(new BN(63)).neg();
const ZERO_BN = new BN(0);

class ExploreDexterity extends React.Component {
    static DefaultState() {
        const rpcs = new Map();
        rpcs.set('Mainnet (HXRO)', 'https://hxro.rpcpool.com/');
        rpcs.set('Devnet (HXRO)', 'https://hxro-hxro-b289.devnet.rpcpool.com/');
        rpcs.set('Testnet (HXRO)', 'https://hxro-hxro-b289.testnet.rpcpool.com/');
        rpcs.set('Local', 'http://localhost:8899/');
        rpcs.set('Mainnet (Public)', 'https://api.mainnet-beta.solana.com');
        rpcs.set('Devnet (Public)', 'https://api.devnet.solana.com');
        const DEFAULT_RPC_NAME = 'Mainnet (HXRO)';
        return {
            manifest: null,
            rpcs,
            selectedRPC: rpcs.get(DEFAULT_RPC_NAME),
            selectedRPCName: DEFAULT_RPC_NAME,
            selectedMPG: null,
            selectedMPGObject: null,
            isFetchingManifest: false,
            bookRecordingStates: {}, // product key str -> book recording state
            books: {}, // product key str -> books struct
            eventQueues: {}, // event queue key str -> event queue struct
            trg: {
                isFetching: false,
                isValid: true,
                selectedTRG: null,
                selectedTRGObject: null,
                selectedTrader: null,
                pastTrgs: JSON.parse(localStorage.getItem('explore-dexterity-past-trgs')) ?? [],
            },
            wallet: {
                isFetchingWallet: false,
                selectedWallet: null,
                trgs: [],
            },
        };
    }

    constructor(props) {
        super(props);
        this.state = ExploreDexterity.DefaultState();
        this.mpgSocket = null;
        this.eventQueue2Socket = {};
        this.product2Sockets = {};
    }

    streamBooks(product) {
        const meta = dexterity.productToMeta(product);
        const productKey = meta.productKey;
        const productKeyStr = productKey.toBase58();
        const baseDecimals = meta.baseDecimals;
        const tickSize = dexterity.Fractional.From(meta.tickSize);
        const priceOffset = dexterity.Fractional.From(meta.priceOffset);
        const priceDecimals = dexterity.getPriceDecimals(meta);
        const manifest = this.state.manifest;
        let marketState = null;
        const orderbookStr = meta.orderbook.toBase58();
        for (const [k, { pubkey, mpg, orderbooks }] of manifest.fields.mpgs) {
            const orderbook = orderbooks.get(orderbookStr);
            if (orderbook) {
                marketState = orderbook;
                break;
            }
        }
        if (marketState === null) {
            console.error('Failed to find orderbook. This should never happen!');
            return;
        }
        const offsetFrac = dexterity.Fractional.From(priceOffset);
        if (this.product2Sockets.hasOwnProperty(productKeyStr)) {
            const sockets = this.product2Sockets[productKeyStr];
            sockets.bidsSocket.close();
            sockets.asksSocket.close();
            sockets.markPricesSocket.close();
            this.product2Sockets[productKeyStr] = undefined;
        }
        this.setState({
            ...this.state,
            bookRecordingStates: {
                ...this.state.bookRecordingStates,
                [productKeyStr]: {
                    isRecording: true,
                    records: [],
                },
            },
            books: {
                ...this.state.books,
                [productKeyStr]: {
                    baseDecimals,
                    tickSize,
                    priceDecimals,
                    markPrice: dexterity.Fractional.Nan(),
                    spreadEma: dexterity.Fractional.Nan(),
                    indexPrice: dexterity.Fractional.Nan(),
                    bids: [],
                    asks: [],
                },
            }
        });
        let p;
        if (product.hasOwnProperty('outright')) {
            p = product.outright.outright;
        } else if (product.hasOwnProperty('combo')) {
            p = product.combo.combo;
        } else {
            console.error('unrecognized product object; this should never happen');
            return;
        }
        this.product2Sockets[productKeyStr] = manifest.streamBooks(
            p,
            marketState,
            book => {
                this.setState({
                    ...this.state,
                    books: {
                        ...this.state.books,
                        [productKeyStr]: {
                            ...this.state.books[productKeyStr],
                            bids: book.bids,
                            asks: book.asks,
                        },
                    }
                });                
            },
            markPrices => {
                const updateSlot = 'TODO: Grab slot from specific product'; // markPrices.updateSlot.toString();
                const markPrice = dexterity.Manifest.GetMarkPrice(markPrices, productKey);
                const spreadEma = dexterity.Manifest.GetMarkPriceOracleMinusBookEwma(markPrices, productKey);
                const indexPrice = markPrice.add(spreadEma);

                let bookPrice = 'NaN';
                let isFound = false;
                for (const [pkStr, { pubkey, mpg, orderbooks }] of this.state.manifest.fields.mpgs) {
                    for (let [productName, { index, product }] of dexterity.Manifest.GetActiveProductsOfMPG(mpg)) {
                        let meta = dexterity.productToMeta(product);
                        if (meta.productKey.toBase58() === productKeyStr) {
                            let p;
                            if (product.hasOwnProperty('outright')) {
                                p = product.outright.outright;
                            } else if (product.hasOwnProperty('combo')) {
                                p = product.combo.combo;
                            } else {
                                console.error('unrecognized product object; this should never happen');
                                return;
                            }
                            const askPriceFrac = dexterity.Fractional.From(p.metadata.prices.ask);
                            const bidPriceFrac = dexterity.Fractional.From(p.metadata.prices.bid);
                            const bookPriceFrac = askPriceFrac.add(bidPriceFrac).div(dexterity.Fractional.New(2, 0));
                            const isAskValid = !(askPriceFrac.m.eq(MAX_ASK) && askPriceFrac.exp.eq(ZERO_BN));
                            const isBidValid = !(bidPriceFrac.m.eq(MIN_BID) && bidPriceFrac.exp.eq(ZERO_BN));
                            if (isAskValid && isBidValid) {
                                bookPrice = bookPriceFrac.toString();
                            } else if (isAskValid) {
                                bookPrice = askPriceFrac.toString();
                            } else if (isBidValid) {
                                bookPrice = bidPriceFrac.toString();
                            }
                            isFound = true;
                            break;
                        }
                    }
                    if (isFound) {
                        break;
                    }
                }

                const recordingState = this.state.bookRecordingStates[productKeyStr];                
                if (recordingState.isRecording) {
                    recordingState.records.push({
                        approximateUnixTimestamp: Math.floor(Date.now() / 1000),
                        approximateSlot: updateSlot,
                        indexPrice: indexPrice.toString(),
                        markPrice: markPrice.toString(),
                        spreadEma: spreadEma.toString(),
                        bookPrice,
                    });
                } 

                this.setState({
                    ...this.state,
                    bookRecordingStates: {
                        ...this.state.bookRecordingStates,
                        [productKeyStr]: recordingState,
                    },
                    books: {
                        ...this.state.books,
                        [productKeyStr]: {
                            ...this.state.books[productKeyStr],
                            updateSlot,
                            markPrice,
                            spreadEma,
                            indexPrice,
                        },
                    }
                });                
            },
        );
    }

    async streamEventQueue(eventQueueStr, callBackInfoLen, baseDecimals, tickSize, priceOffset) {
        const offsetFrac = dexterity.Fractional.From(priceOffset);
        const manifest = this.state.manifest;
        if (this.eventQueue2Socket.hasOwnProperty(eventQueueStr)) {
            this.eventQueue2Socket[eventQueueStr].close();
            this.eventQueue2Socket[eventQueueStr] = undefined;
        }
        this.setState({
            ...this.state,
            eventQueues: {
                ...this.state.eventQueues,
                [eventQueueStr]: {
                    callBackInfoLen,
                    baseDecimals,
                    tickSize,
                    eventQueue: {
                        seqNum: '...',
                        count: '...',
                        events: [],
                    }
                },
            }
        });
        this.eventQueue2Socket[eventQueueStr] = manifest.accountSubscribe(
            new solana.PublicKey(eventQueueStr),
            (data, manifest) => {
                return AaobEventQueue.parse(callBackInfoLen, data);
            },
            eventQueue => {
                const seqNum = eventQueue.header.seqNum.toNumber();
                const count = eventQueue.header.count.toNumber();
                const events = [];
                for (let i = 0; i < count; i++) {
                    try {
                        const event = eventQueue.parseEvent(i);
                        if (event instanceof EventFill) {
                            const baseQty = dexterity.Fractional.New(event.baseSize, baseDecimals);
                            const quoteQty = dexterity.Fractional.New(event.quoteSize, baseDecimals);
                            events.push({
                                type: EVENT_TYPE_FILL,
                                price: quoteQty.div(baseQty).mul(dexterity.Fractional.From(tickSize)).sub(offsetFrac).toString(baseDecimals, true),
                                quantity: baseQty.toString(true),
                                isBidAgressor: event.takerSide === 0,
                                makerOrderId: event.makerOrderId.toString(),
                                maker: (new solana.PublicKey(event.makerCallBackInfo.slice(0, 32))).toBase58(),
                                taker: (new solana.PublicKey(event.takerCallBackInfo.slice(0, 32))).toBase58(),
                                takerOrderNonce: (new BN(event.takerCallBackInfo.slice(40, 56), undefined, 'le')).toString(),
                                // rawFill: JSON.stringify(event),
                            });
                        } else {
                            events.push({
                                type: EVENT_TYPE_OUT,
                                quantity: dexterity.Fractional.New(event.baseSize, baseDecimals).toString(baseDecimals, true),
                                orderId: event.orderId.toString(),
                                maker: (new solana.PublicKey(event.callBackInfo.slice(0, 32))).toBase58(),
                                openOrdersIndex: (new BN(event.callBackInfo.slice(32, 40), undefined, 'le')).toString(),
                                side: event.side === 0 ? 'bid' : (event.side === 1 ? 'ask' : 'unrecognized')
                                // rawOut: JSON.stringify(event),
                            });
                        }
                    } catch (e) {
                        console.error(e);
                        events.push({
                            type: 'fail'
                        });
                    }
                }
                this.setState({
                    ...this.state,
                    eventQueues: {
                        ...this.state.eventQueues,
                        [eventQueueStr]: {
                            eventQueue: {
                                seqNum,
                                count,
                                events,
                            }
                        }
                    }
                });
            },
        );
    }

    async fetchTRG(trgStr) {
        this.setState({
            ...this.state,
            trg: {
                ...this.state.trg,
                isFetching: true,
                selectedTRG: trgStr,
                selectedTRGObject: null,
            }
        });
        if (trgStr.trim() === '') {
            this.setState({
                ...this.state,
                trg: {
                    ...this.state.trg,
                    isFetching: false,
                    isValid: true,
                }
            });
            return;
        }
        let trgPubkey;
        try {
            trgPubkey = new solana.PublicKey(trgStr);
        } catch (e) {
            console.error(e);
            this.setState({
                ...this.state,
                trg: {
                    ...this.state.trg,
                    isFetching: false,
                    isValid: false,
                }
            });
            return;
        }
        this.setState({
            ...this.state,
            trg: {
                ...this.state.trg,
                isFetching: true,
                isValid: true,
                selectedTRG: trgStr,
                selectedTRGObject: null,
            }
        });
        // let trg = null;
        let trader = null;
        try {
            trader = new dexterity.Trader(this.state.manifest, trgPubkey, true);
            await trader.connect(
                this.onTraderUpdate.bind(this),
                this.onTraderUpdate.bind(this),
            );
            // trg = await this.state.manifest.getTRG(trgPubkey);
            // console.log(trg);
        } catch (e) {
            console.error(e);
            this.setState({
                ...this.state,
                trg: {
                    ...this.state.trg,
                    isFetching: false,
                    isValid: false,
                    selectedTRG: null,
                    selectedTRGObject: null,
                    selectedTrader: null,
                }
            });
            return;            
        }
        const pastTrgs = [...new Set(this.state.trg.pastTrgs.concat([trgStr]))];
        localStorage.setItem('explore-dexterity-past-trgs', JSON.stringify(pastTrgs));
        this.setState({
            ...this.state,
            trg: {
                ...this.state.trg,
                isFetching: false,
                isValid: true,
                selectedTRG: trgStr,
                selectedTRGObject: trader.trg,
                selectedTrader: trader,
                updateTime: new Date(),
                pastTrgs,
            }
        });        
    }

    onTraderUpdate() {
        const trader = this.state.trg.selectedTrader;
        if (!trader) {
            return;
        }
        this.setState({
            ...this.state,
            trg: {
                ...this.state.trg,
                selectedTRGObject: trader.trg,
                selectedTrader: trader,
                updateTime: new Date(),
            }
        });
    }

    async fetchManifest(rpcName, rpc, useCache = true) {
        try {
            let url = new URL(rpc);
            this.setState({
                selectedRPCName: rpcName,
                selectedRPC: rpc,
                isFetchingManifest: true,
                isValidRPC: true
            });
            const manifest = await dexterity.getManifest(rpc, useCache);
            await manifest.fetchOrderbooks();
            await manifest.updateCovarianceMetadatas();
            let arbitraryMPGStr = null;
            let arbitraryMPGPk = null;
            if (this.state.selectedRPCName.includes('Mainnet')) {
                for (const [pkStr, { pubkey, orderbooks, covarianceMetadatas }] of manifest.fields.mpgs) {
                    arbitraryMPGStr = pkStr;
                    arbitraryMPGPk = pubkey;
                    if (pkStr === '4cKB5xKtDpv4xo6ZxyiEvtyX3HgXzyJUS1Y8hAfoNkMT') {
                        break;
                    }
                }
            } else {
                for (const [pkStr, { pubkey, orderbooks, covarianceMetadatas }] of manifest.fields.mpgs) {
                    arbitraryMPGStr = pkStr;
                    arbitraryMPGPk = pubkey;
                    break;
                }
            }
            if (arbitraryMPGPk !== null) {
                if (this.mpgSocket !== null) {
                    this.mpgSocket.close();
                }
                this.mpgSocket = manifest.streamMPG(
                    arbitraryMPGPk,
                    async mpg => {
                        const manifest = this.state.manifest;
                        const oldObj = manifest.fields.mpgs.get(arbitraryMPGStr);
                        manifest.fields.mpgs.set(
                            arbitraryMPGStr,
                            { ...oldObj, mpg, pubkey: arbitraryMPGPk }
                        );
                        // for (const [pkStr, { pubkey, orderbooks }] of manifest.fields.mpgs) {
                        //    if (pkStr !== arbitraryMPGStr) {
                        //        continue;
                        //    }
                        //    for (let [productName, { index, product }] of dexterity.Manifest.GetActiveProductsOfMPG(mpg)) {
                        //        const meta = dexterity.productToMeta(product);
                        //        if (!orderbooks.has(meta.orderbook.toBase58())) {
                        //            await manifest.fetchOrderbook(meta.orderbook);
                        //        }
                        //    }
                        // }
                        // await manifest.fetchOrderbooks(arbitraryMPGPk);
                        this.setState({
                            ...this.state,
                            manifest,
                        });
                    },
                );
            }
            this.setState({ manifest, selectedMPG: arbitraryMPGStr, isFetchingManifest: false });
        } catch (e) {
            console.error(e);
            this.setState({
                selectedRPCName: rpcName,
                selectedRPC: rpc,
                isFetchingManifest: false,
                isValidRPC: false
            });
        }
    }

    async componentDidMount() {
        this.fetchManifest(this.state.selectedRPCName, this.state.selectedRPC);
    }

    async timeTravelToDate(date) {
        await this.state.trg.selectedTrader.timeTravelToDate(date);
        this.forceUpdate();
    }

    componentDidUpdate() {
    }

    render() {
        return (
            <div className="ExploreDexterity">
                <Header
                    isFetchingManifest={this.state.isFetchingManifest}
                    manifest={this.state.manifest}
                    selectedMPG={this.state.selectedMPG}
                    onMpgChange={pk => {
                        let pubkeyObject = null;
                        let orderbooksObject = null;
                        for (const [pkStr, { pubkey, orderbooks }] of this.state.manifest.fields.mpgs) {
                            if (pkStr === pk) {
                                pubkeyObject = pubkey;
                                orderbooksObject = orderbooks;
                                break;
                            }
                        }
                        if (this.mpgSocket !== null) {
                            this.mpgSocket.close();
                        }
                        if (pubkeyObject !== null) {
                            const manifest = this.state.manifest;
                            this.mpgSocket = manifest.streamMPG(
                                pubkeyObject,
                                async mpg => {
                                    const manifest = this.state.manifest;
                                    const oldObj = manifest.fields.mpgs.get(pk);
                                    manifest.fields.mpgs.set(
                                        pk,
                                        { ...oldObj, pubkey: pubkeyObject, orderbooks: orderbooksObject }
                                    );
                                    for (const [pkStr, { pubkey, orderbooks }] of manifest.fields.mpgs) {
                                        if (pkStr !== pk) {
                                            continue;
                                        }
                                        for (let [productName, { index, product }] of dexterity.Manifest.GetActiveProductsOfMPG(mpg)) {
                                            const meta = dexterity.productToMeta(product);
                                            if (!orderbooks.has(meta.orderbook.toBase58())) {
                                                await manifest.fetchOrderbook(meta.orderbook);
                                            }
                                        }
                                    }
                                    // await manifest.fetchOrderbooks(pubkeyObject);
                                    this.setState({
                                        ...this.state,
                                        manifest,
                                    });
                                },
                            );
                        }
                        this.setState({ selectedMPG: pk });
                    }}
                    rpcs={this.state.rpcs}
                    selectedRPC={this.state.selectedRPC}
                    selectedRPCName={this.state.selectedRPCName}
                    isValidRPC={this.state.isValidRPC}
                    onRpcChange={async rpc => {
                        let rpcName = rpc;
                        for (let [name, v] of this.state.rpcs) {
                            if (v === rpc) {
                                rpcName = name;
                                break;
                            }
                        }
                        this.fetchManifest(rpcName, rpc);
                    }}
                />
                <div className="AppBody">
                    <MPG
                        manifest={this.state.manifest ?? null}
                        mpg={this.state.manifest?.fields?.mpgs?.get(this.state.selectedMPG)}
                        books={this.state.books}
                        bookRecordingStates={this.state.bookRecordingStates}
                        onStartRecordingBook={productKeyStr => {
                            this.setState({
                                ...this.state,
                                bookRecordingStates: {
                                    ...this.state.bookRecordingStates,
                                    [productKeyStr]: {
                                        isRecording: true,
                                        records: [],
                                    },
                                },
                            });
                            
                        }}
                        onStopRecordingBook={productKeyStr => {
                            this.setState({
                                ...this.state,
                                bookRecordingStates: {
                                    ...this.state.bookRecordingStates,
                                    [productKeyStr]: {
                                        ...this.state.bookRecordingStates[productKeyStr],
                                        isRecording: false,
                                    },
                                },
                            });
                            
                        }}
                        onStreamBooks={this.streamBooks.bind(this)}
                        eventQueues={this.state.eventQueues}
                        onStreamEventQueue={this.streamEventQueue.bind(this)}
                    />
                    <TRGBrowser
                        isFetchingTRG={this.state.trg.isFetching}
                        isValidTRG={this.state.trg.isValid}
                        trgUpdateTime={this.state.trg.updateTime}
                        selectedTRG={this.state.trg.selectedTRG}
                        selectedTRGObject={this.state.trg.selectedTRGObject}
                        selectedTrader={this.state.trg.selectedTrader}
                        pastTrgs={this.state.trg.pastTrgs}
                        onTrgChange={async trgStr => {
                            await this.fetchTRG(trgStr);
                        }}
                        timeTravelToDate={this.timeTravelToDate.bind(this)}
                        manifest={this.state.manifest}
                        isFetchingWallet={this.state.wallet.isFetching}
                        selectedWallet={this.state.wallet.selectedWallet}
                        walletTrgs={this.state.wallet.trgs}
                    />
                </div>
                <div className="MadeWithBamboo">Made with <a href="https://github.com/rilwis/bamboo" target="_blank">bamboo</a> ❤️</div>
            </div>
        );
    }
}
 
export default ExploreDexterity;
