import React from "react";
import * as solana from '@solana/web3.js';
import { EVENT_TYPE_FILL, EVENT_TYPE_OUT } from './constants.js';
import Pubkey from './Pubkey.js';
import Scrollable from './Scrollable.js';
import './EventQueue.css';

class EventQueue extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const eventQueue = this.props.eventQueue ?? {
            seqNum: '...',
            count: '...',
            events: [],
        };
        const events = [];
        for (const event of eventQueue.events) {
            if (event.type === EVENT_TYPE_FILL) {
                events.push(<div className="EventFill">
                                <div>Event Type</div><div>Fill</div>
                                <div>Price</div><div>{event.price}</div>
                                <div>Quantity</div><div>{event.quantity}</div>
                                <div>Is Bid Aggr.</div><div>{event.isBidAggressor}</div>
                                <div>Maker Order Id</div><Scrollable text={event.makerOrderId} />
                                <div>Taker Order Nonce</div><Scrollable text={event.takerOrderNonce} />
                            </div>);
            } else if (event.type === EVENT_TYPE_OUT) {
                events.push(<div className="EventOut">
                                <div>Event Type</div><div>Out</div>
                                <div>Maker</div><Pubkey pubkey={event.maker} />
                                <div>Side</div><div>{event.side}</div>
                                <div>Quantity</div><div>{event.quantity}</div>
                                <div>Order Id</div><Scrollable text={event.orderId} />
                                <div>Open Orders Index</div><Scrollable text={event.openOrdersIndex} />
                            </div>);
            } else {
                events.push(<div>Unrecognized event -- this should never happen!<span>{JSON.stringify(event)}</span></div>);
            }
        }
        return (
            <div className="EventQueue">
                <div className="EventQueueHeader">
                    <div>Seq. Num.</div><div>{eventQueue.seqNum}</div>
                    <div># Events in Queue</div><div>{eventQueue.count}</div>
                </div>
                <div className="EventQueueEvents">
                    {events.length > 0 ? events : 'The queue is empty!'}
                </div>
            </div>
        );
    }
}

export default EventQueue;
