import dexterity from '@hxronetwork/dexterity-ts';
import React from "react";
import Pubkey from './Pubkey.js';
import './TRGPositions.css';

class TRGPositions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isPositionShown: {}, // maps product key to boolean
        };
    }
    render() {
        const positions = [];
        for (const [i, position] of this.props.positions.entries()) {
            if (!position.tag.hasOwnProperty('traderPosition')) {
                continue;
            }
            // console.log(position);
            const productKey = position.productKey.toBase58();
            const positionFrac = dexterity.Fractional.From(position.position);
            const pendingPositionFrac = dexterity.Fractional.From(position.pendingPosition);
            let baseDecimals = 6;
            let productName = 'Product not found! (Bad state!)';
            if (this.props.mpg) {
                for (let [_productName, { index, product }] of dexterity.Manifest.GetProductsOfMPG(this.props.mpg.mpg)) {
                    const meta = dexterity.productToMeta(product);
                    if (meta.productKey.toBase58() === productKey) {
                        productName = _productName;
                        baseDecimals = meta.baseDecimals.toNumber();
                        break;
                    }
                }
            }
            positions.push(
                <div className="TRGPosition" key={'position-' + i}>
                    <div className="TRGPositionGrid">
                        <div>Product Name</div>
                        <div>{productName}</div>
                        <div>Position (Settled + Pending)</div>
                        <div>{positionFrac.add(pendingPositionFrac).toString(baseDecimals, true)}</div>
                    </div>
                    <button
                        onClick={_ => {
                            this.setState({
                                ...this.state,
                                isPositionShown: {
                                    ...this.state.isPositionShown,
                                    [productKey]: !this.state.isPositionShown[productKey]
                                }
                            });
                        }}
                    >{this.state.isPositionShown[productKey] ? 'Hide' : 'More Details'}</button>
                    {this.state.isPositionShown[productKey] &&
                     <div className="TRGPositionGrid">
                         <div>Product Key</div>
                         <Pubkey pubkey={productKey} />
                         <div>Product Index</div>
                         <div>{position.productIndex.toString()}</div>
                         <div>Settled Position</div>
                         <div>{positionFrac.toString(baseDecimals, true)}</div>
                         <div>Pending Position</div>
                         <div>{pendingPositionFrac.toString(baseDecimals, true)}</div>
                         <div>Last Cum. Funding Snapshot</div>
                         <div>{dexterity.Fractional.From(position.lastCumFundingSnapshot).toString()}</div>
                         <div>Last Social Loss Snapshot</div>
                         <div>{dexterity.Fractional.From(position.lastSocialLossSnapshot).toString()}</div>
                     </div>
                    }
                </div>
            );
        }
        return (
            <div className="TRGPositions">
                <div className="TRGPositionsTitle">Positions</div>
                {positions.length > 0 ? (<div className="TRGPositionsGrid">{positions}</div>) : 'No positions!'}
            </div>
        );
    }
}

export default TRGPositions;
