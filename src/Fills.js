import dexterity from '@hxronetwork/dexterity-ts';
import React from "react";
import Pubkey from './Pubkey.js';
import Scrollable from './Scrollable.js';
import './Fills.css';

class Fills extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const fills = [];
        for (const [i, fill] of this.props.fills.entries()) {
            let partiesDetails = null;
            if (this.props.traderRiskGroup === fill.taker_trg &&
                this.props.traderRiskGroup === fill.maker_trg) {
                partiesDetails = (
                    <>
                        <div>Side</div>
                        <div>It appears this fill was a self-trade, but self-trading is disabled, so the fills API must be misconstruing cancels as fills in this case (or something like that).</div>
                    </>
                );
            } else if (this.props.traderRiskGroup === fill.taker_trg) {
                partiesDetails = (
                    <>
                        <div>(This TRG's) Side</div>
                            <div>{fill.taker_side}</div>
                            <div>Counterparty TRG (Maker)</div>
                            <Pubkey pubkey={fill.maker_trg} />
                    </>                            
                );
            } else if (this.props.traderRiskGroup == fill.maker_trg) {
                partiesDetails = (
                    <>
                        <div>(This TRG's) Side</div>
                        <div>{fill.taker_side === 'bid' ? 'ask' : 'bid'}</div>
                        <div>Counterparty TRG (Taker)</div>
                        <Pubkey pubkey={fill.taker_trg} />
                    </>
                );
            } else {
                partiesDetails = (
                    <>
                        <div>Maker TRG</div>
                        <Pubkey pubkey={fill.maker_trg} />
                        <div>Taker TRG</div>
                        <Pubkey pubkey={fill.taker_trg} />
                        <div>Taker Side</div>
                        <div>{fill.taker_side}</div>
                    </>
                );
            }
            fills.push(
                <div className="Fill" key={'position-' + i}>
                    <div className="FillGrid">
                        <div>Product Name</div>
                        <div>{fill.product}</div>
                        <div>Base Size</div>
                        <div>{fill.base_size}</div>
                        <div>Quote Size</div>
                        <div>{fill.quote_size}</div>
                        <div>Price</div>
                        <div>{fill.price}</div>
                        {partiesDetails}
                        <div>Block Timestamp</div>
                        <div>{fill.block_timestamp}</div>
                        <div>Inserted At</div>
                        <div>{fill.inserted_at}</div>
                        <div>Slot</div>
                        <div><a href={'https://explorer.solana.com/block/' + fill.slot}>{fill.slot}</a></div>
                        <div>Tx Signature</div>
                        <Scrollable text={fill.tx_sig} />
                        <div>Maker Order Id</div>
                        <Scrollable text={fill.maker_order_id} />
                     </div>
                </div>
            );
        }
        return (
            <div className="FillsContainer">
                <div className="FillsTitle">Fills</div>
                {fills.length > 0 ? (<div className="FillsGrid">{fills}</div>) : 'No fills!'}
            </div>
        );
    }
}

export default Fills;
