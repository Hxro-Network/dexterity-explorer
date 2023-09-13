import BN from 'bn.js';
import dexterity from '@hxronetwork/dexterity-ts';
import React from "react";
import Pubkey from './Pubkey.js';
import Scrollable from './Scrollable.js';
import Fills from './Fills.js';
import TRGOpenOrders from './TRGOpenOrders.js';
import TRGPositions from './TRGPositions.js';
import './TRG.css';

const INVALID_TIMESTAMP_STYLE = {
    border: 'solid 1px red',
    boxShadow: '1px 1px 5px 1px red',
    color: 'red',
};

class TRG extends React.Component {
    constructor(props) {
        super(props);
        this.handleTimestampChange = this.handleTimestampChange.bind(this);
        this.state = {
            traderRiskGroup: '',
            fills: [],
            timestamp: null,
            isValidTimestamp: true,
            neverGetFills: false,
        };
    }
    async handleTimestampChange(e) {
        const date = new Date(e.target.value);
        const isValid = !isNaN(date);
        this.setState({
            timestamp: e.target.value,
            isValidTimestamp: isValid
        });
        if (!isValid) {
            return;
        }
        await this.props.timeTravelToDate(date);
        console.log('success!', this.trader);
    }
    async componentDidUpdate() {
        if (this.state.neverGetFills) {
            return;
        }
        if (this.props.isValid && !this.props.isFetching && this.props.trader !== null && this.props.trader.traderRiskGroup.toBase58() !== this.state.traderRiskGroup) {
            this.setState((state, props) => ({
                traderRiskGroup: props.trader.traderRiskGroup.toBase58(),
                neverGetFills: true,
            }));
            const fills = await this.props.trader.manifest.getFills('BTCUSD-PERP', this.props.trader.traderRiskGroup, null, null);
            const MAX_FILLS = 7;
            fills.fills.sort((a, b) => Date.parse(b.block_timestamp) - Date.parse(a.block_timestamp)); // newest to oldest
            this.setState((state, props) => ({
                traderRiskGroup: props.trader.traderRiskGroup.toBase58(),
                fills: fills.fills.slice(0, MAX_FILLS),
            }));
        } else if (this.props.isValid && this.props.isFetching) {
            this.setState((state, props) => ({
                traderRiskGroup: this.props.trader !== null ? this.props.trader.traderRiskGroup.toBase58() : null,
                fills: [],
                neverGetFills: true,
            }));
        }
    }
    getUpdateTimeString() {
        const cacheDate = this.props.updateTime;
        let diff = Math.round((Date.now() - cacheDate) / 1000);
        let units = 'seconds'
        if (diff > 60) {
            diff = Math.round(diff / 60);
            units = 'minutes';
            if (diff > 60) {
                diff = Math.round(diff / 60);
                units = 'hours';
                if (diff > 24) {
                    diff = Math.round(diff / 24);
                    units = 'days';
                    if (diff > 365) {
                        diff = Math.round(diff / 365);
                        units = 'years';
                    } // lol
                }
            }
        }
        return '~' + diff + ' ' + units + ' ago';
    }
    render() {
        const validStr = this.props.isValid ? '' : 'Not a TRG\'s public key. ';
        const fetchingStr = this.props.isFetching ? 'Fetching...' : 'Updated ' + this.getUpdateTimeString();
        const headerStr = this.props.manifest !== null ?
              (this.props.trgObject !== null ? (validStr + fetchingStr) : 'Paste a TRG public key')
              : 'Fetching manifest...';
        let portfolioValue, positionValue;
        let requiredMaintenanceMargin, excessInitialMargin, excessMaintenanceMarginWithoutOpenOrders, excessMaintenanceMargin;
        let cashBalance, netCashBalance, pendingCashBalance;
        let pnl;
        let totalDeposited, totalWithdrawn;
        let mpg;
        let notionalMakerVolume, notionalTakerVolume, referredTakersNotionalVolume, referralFees;
        if (this.props.trader !== null && this.props.trgObject !== null) {
            portfolioValue = this.props.trader.getPortfolioValue();
            requiredMaintenanceMargin = this.props.trader.getRequiredMaintenanceMargin();
            excessInitialMargin = this.props.trader.getExcessInitialMargin();
            excessMaintenanceMarginWithoutOpenOrders = this.props.trader.getExcessMaintenanceMarginWithoutOpenOrders();
            excessMaintenanceMargin = this.props.trader.getExcessMaintenanceMargin();
            positionValue = this.props.trader.getPositionValue();
            netCashBalance = this.props.trader.getNetCash();
            cashBalance = this.props.trader.getCashBalance();
            pendingCashBalance = this.props.trader.getPendingCashBalance();
            pnl = this.props.trader.getPnL();
            totalDeposited = this.props.trader.getTotalDeposited();
            totalWithdrawn = this.props.trader.getTotalWithdrawn();
            notionalMakerVolume = this.props.trader.getNotionalMakerVolume();
            notionalTakerVolume = this.props.trader.getNotionalTakerVolume();
            referredTakersNotionalVolume = this.props.trader.getReferredTakersNotionalVolume();
            referralFees = this.props.trader.getReferralFees();


            // we cannot just do this because might not have gotten the mpg yet: mpg = this.props.trader.mpg;            
            const trgMpgPkStr = this.props.trgObject.marketProductGroup.toBase58();
            for (const [mpgPkStr, m] of this.props.manifest.fields.mpgs) {
                if (mpgPkStr === trgMpgPkStr) {
                    mpg = m;
                    break;
                }
            }
        }
//         if (this.props.trgObject !== null) {
//             cashBalance = dexterity.Fractional.From(this.props.trgObject.cashBalance);
//             pendingCashBalance = dexterity.Fractional.From(this.props.trgObject.pendingCashBalance);
//             totalDeposited = dexterity.Fractional.From(this.props.trgObject.totalDeposited);
//             totalWithdrawn = dexterity.Fractional.From(this.props.trgObject.totalWithdrawn);
//             const trgMpgPkStr = this.props.trgObject.marketProductGroup.toBase58();
//             for (const [mpgPkStr, m] of this.props.manifest.fields.mpgs) {
//                 if (mpgPkStr === trgMpgPkStr) {
//                     mpg = m;
//                     break;
//                 }
//             }
//         }
        return (
            <div className="TRG">
                <div className="TRGHeader">
                    {headerStr}
                </div>
                    {this.props.trgObject !== null ?
                     (<>
                         <div className="TRGBody">
                             {/*<div>Approx. Timestamp</div><div><input
                                                          type="text"
                                                          placeholder={this.props.updateTime}
                                                          value={this.state.timestamp}
                                                          onChange={this.handleTimestampChange}
                                                          style={ this.state.isValidTimestamp ? {'border': 'solid 1px var(--b-txt)'} : INVALID_TIMESTAMP_STYLE }></input></div>*/}
                             {this.props.trader.isPaused &&
                              <>
                                  <div>TRG Timestamp</div><div>{this.props.trader.trgDate?.toString().split(' ').slice(0, 5).join(' ') ?? 'Loading...'}</div>
                                  <div>Risk Timestamp</div><div>{this.props.trader.riskDate?.toString().split(' ').slice(0, 5).join(' ') ?? 'Loading...'}</div>
                                  <div>MPG Timestamp</div><div>{this.props.trader.mpgDate?.toString().split(' ').slice(0, 5).join(' ') ?? 'Loading...'}</div>
                                  <div>Mark Prices Timestamp</div><div>{this.props.trader.markPricesDate?.toString().split(' ').slice(0, 5).join(' ') ?? 'Loading...'}</div>
                              </>}
                             <div>TRG Public Key</div><Pubkey pubkey={this.props.trgKey} />
                             <div>Market Product Group</div><Pubkey pubkey={this.props.trgObject.marketProductGroup.toBase58()} />
                             <div>Owner</div><Pubkey pubkey={this.props.trgObject.owner.toBase58()} />
                             <div>Positions + Cash</div><div>${portfolioValue.toString(2, true)}</div>
                             <div>Required Maintenance Margin</div><div>${requiredMaintenanceMargin.toString(2, true)}</div>
                             <div>Excess Maint. Margin</div><div>${excessMaintenanceMargin.toString(2, true)}</div>
                             <div>Excess Maint. Margin (Not Counting Open Orders)</div><div>${excessMaintenanceMarginWithoutOpenOrders.toString(2, true)}</div>
                             <div>Excess Initial Margin</div><div>${excessInitialMargin.toString(2, true)}</div>
                             <div>Positions</div><div>${positionValue.toString(2, true)}</div>
                             <div>Cash (Pending + Settled)</div><div>${netCashBalance.toString(2, true)}</div>
                             <div>PnL (Unrealized + Realized)</div><div>${pnl.toString(2, true)}</div>
                         </div>
                          <Fills fills={this.state.fills} traderRiskGroup={this.state.traderRiskGroup} />
                          <TRGPositions positions={this.props.trgObject.traderPositions} mpg={mpg} />
                          <TRGOpenOrders openOrders={this.props.trgObject.openOrders} mpg={mpg} />
                          <div className="TRGBody">
                             <div>All-Time Deposits</div><div>${totalDeposited.toString(2, true)}</div>
                             <div>All-Time Withdrawals</div><div>${totalWithdrawn.toString(2, true)}</div>
                             <div>Maker Fee Bps</div><div>{this.props.trgObject.makerFeeBps}</div>
                             <div>Taker Fee Bps</div><div>{this.props.trgObject.takerFeeBps}</div>
                             <div>Settled Cash Balance</div><div>{'$'+cashBalance.toString(2, true)}</div>
                              <div>Pending Cash Balance</div><div>{'$'+pendingCashBalance.toString(2, true)}</div>
                             <div>Fee State Account</div><Pubkey pubkey={this.props.trgObject.feeStateAccount.toBase58()} />
                             <div>Risk State Account</div><Pubkey pubkey={this.props.trgObject.riskStateAccount.toBase58()} />
                             <div>Valid Until (For Fees Calc.)</div><Scrollable cols={10} text={(new Date(this.props.trgObject.validUntil.toNumber()*1000)).toString()} />
                              <div>Notional Maker Volume</div><div>${notionalMakerVolume.toString(2, true)}</div>
                              <div>Notional Taker Volume</div><div>${notionalTakerVolume.toString(2, true)}</div>
                              <div>Referred Takers Notional Volume</div><div>${referredTakersNotionalVolume.toString(2, true)}</div>
                              <div>Referral Fees</div><div>${referralFees.toString(2, true)}</div>
                         </div>
                      </>)
                     :
                     (<div className="TRGBody">                
                          <div>TRG Public Key</div><Pubkey pubkey={this.props.trgKey} />
                      </div>)
                    }
            </div>
        );
    }
}

export default TRG;
