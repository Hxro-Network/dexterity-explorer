import BN from 'bn.js';
import dexterity from '@hxronetwork/dexterity-ts';
import React from "react";
import Pubkey from './Pubkey.js';
import Scrollable from './Scrollable.js';
import './TRGOpenOrders.css';

class TRGOpenOrders extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpenOrderProductShown: {}, // maps product key to boolean
        };
    }
    render() {
        const openOrderProducts = [];
        for (const [productIndex, product] of this.props.openOrders.products.entries()) {
            const askQtyInBook = dexterity.Fractional.From(product.askQtyInBook);
            const bidQtyInBook = dexterity.Fractional.From(product.bidQtyInBook);
            if (!(product.numOpenOrders.toNumber() > 0 ||
                  !askQtyInBook.eq(dexterity.Fractional.Zero()) ||
                  !bidQtyInBook.eq(dexterity.Fractional.Zero())
                 )) {
                continue;
            }
            let baseDecimals = 6;
            let productName = 'Product not found! (Bad state!) productIndex = ' + productIndex;
            if (this.props.mpg) {
                for (let [_productName, { index, product }] of dexterity.Manifest.GetProductsOfMPG(this.props.mpg.mpg)) {
                    if (index !== productIndex) {
                        continue;
                    }
                    productName = _productName;
                    const meta = dexterity.productToMeta(product);
                    baseDecimals = meta.baseDecimals.toNumber();
                    break;
                }
            }
            const orders = [];
            if (this.state.isOpenOrderProductShown[productIndex]) {
                let orderIndex = product.headIndex.toNumber();
                while (orderIndex > 0) {
                    if (orderIndex >= 1024) {
                        orders.push(
                            <div className="TRGOpenOrder">
                                <div>Invalid Open Orders State!</div>
                                <div>While traversing open orders, encountered index {'>'} 1023</div>
                                <div>Order Index</div>
                                <div>{orderIndex}</div>
                            </div>
                        );
                        break;
                    } else {
                        const order = this.props.openOrders.orders[orderIndex];
                        orders.push(
                            <div className="TRGOpenOrder">
                                <div>Order Id</div>
                                <Scrollable text={order.id.toString()} />
                                <div>Client Order Id</div>
                                <Scrollable text={order.clientId.toString()} />
                                <div>Quantity</div>
                                <div>{dexterity.Fractional.New(order.qty, new BN(baseDecimals)).toString(baseDecimals, true)}</div>
                                <div>Prev. Index</div>
                                <div>{order.prev.toString()}</div>
                                <div>Next Index</div>
                                <div>{order.next.toString()}</div>
                            </div>
                        );
                        orderIndex = order.next.toNumber();
                    }
                }
            }
            openOrderProducts.push(
                <div className="TRGOpenOrderProduct" key={'openOrderProduct-' + productIndex}>
                    <div className="TRGOpenOrderProductGrid">
                        <div>Product Name</div>
                        <div>{productName}</div>
                        <div>Num. Open Orders</div>
                        <div>{product.numOpenOrders.toString()}</div>
                        <div>Ask Qty In Book</div>
                        <div>{askQtyInBook.toString(baseDecimals, true)}</div>
                        <div>Bid Qty In Book</div>
                        <div>{bidQtyInBook.toString(baseDecimals, true)}</div>
                        <div>Head Index</div>
                        <div>{product.headIndex.toString()}</div>
                    </div>
                    <button
                        onClick={_ => {
                            this.setState({
                                ...this.state,
                                isOpenOrderProductShown: {
                                    ...this.state.isOpenOrderProductShown,
                                    [productIndex]: !this.state.isOpenOrderProductShown[productIndex]
                                }
                            });
                        }}
                    >{this.state.isOpenOrderProductShown[productIndex] ? 'Hide' : 'More Details'}</button>
                    {this.state.isOpenOrderProductShown[productIndex] &&
                     <div className="TRGOpenOrdersGrid">
                         {orders}
                     </div>
                    }
                </div>
            );
        }
        return (
            <div className="TRGOpenOrders">
                <div className="TRGOpenOrdersTitle">Open Orders Struct</div>
                <div className="TRGOpenOrdersMetadata">
                    <div>Total Open Orders</div>
                    <div>{this.props.openOrders.totalOpenOrders.toString()}</div>
                    <div>Free List Head</div>
                    <div>{this.props.openOrders.freeListHead.toString()}</div>
                </div>
                {openOrderProducts.length > 0 ? (<div className="TRGOpenOrderProductsGrid">{openOrderProducts}</div>) : 'No openOrderProducts!'}
            </div>
        );
    }
}

export default TRGOpenOrders;
