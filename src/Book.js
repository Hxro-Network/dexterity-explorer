import BN from 'bn.js';
import dexterity from '@hxronetwork/dexterity-ts';
import React from "react";
import './Book.css';

class Book extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        let indexPrice = 'No index price!';
        let markPrice = 'No mark price!';
        let spreadEma = 'No spread EMA!';
        const ticks = [];
        if (this.props.book) {
            indexPrice = this.props.book.indexPrice.toString(this.props.book.priceDecimals, true);
            markPrice = this.props.book.markPrice.toString(this.props.book.priceDecimals, true);
            spreadEma = this.props.book.spreadEma.toString(this.props.book.priceDecimals, true);
            for (const ask of this.props.book.asks) {
                ticks.push(
                    <>
                        <div className="BookBid"></div>
                        <div className="BookPrice">{ask.price.toString(this.props.book.priceDecimals, true)}</div>
                        <div className="BookAsk">{ask.quantity.toString()}</div>
                    </>
                );
            }
            for (const bid of this.props.book.bids) {
                ticks.push(
                    <>
                        <div className="BookBid">{bid.quantity.toString()}</div>
                        <div className="BookPrice">{bid.price.toString(this.props.book.priceDecimals, true)}</div>
                        <div className="BookAsk"></div>
                    </>
                );
            }
        }
        return (
            <div className="Book">
                <div className="BookMeta">
                    <div>†Index Price</div>
                    <div>{indexPrice}</div>
                    <div>Mark Price</div>
                    <div>{markPrice}</div>
                </div>
                {ticks.length > 0 ?
                <div className="Ladder">
                    {ticks}
                </div> :
                 'The book is empty!'
                }
                <button
                    onClick={_ => {
                        if (!this.props.recordingState.isRecording) {
                            this.props.onStartRecording();
                        } else {
                            this.props.onStopRecording();
                        }
                    }}
                >
                    {this.props.recordingState.isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                <div>
                    <a href={URL.createObjectURL(new Blob(
                           [JSON.stringify(this.props.recordingState.records)],
                           { type: "application/json" }
                       ))}
                       target="_blank">Download Recording</a>
                </div>
                <div style={{'fontSize': '.77rem'}}>†Displayed index price is cached on-chain</div>
            </div>
        );
//                    <div>Spread EMA</div>
//                    <div>{spreadEma}</div>
    }
}

export default Book;
