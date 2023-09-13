import dexterity from '@hxronetwork/dexterity-ts';
import React from "react";
import Products from './Products.js';
import Pubkey from './Pubkey.js';
import './MPG.css';

class MPG extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isAdditionalInfoShown: false,
        };
    }
    render() {
        const mpg = {
            name: 'No MPG selected.',
            pubkey: '...',
            collectedFees: '...',
            // more info
            authority: '...',
            successor: '...',
            vaultMint: '...',
            decimals: '...',
            sequenceNumber: '...',
            // seldom used
            feeCollector: '...',
            feeModelConfigurationAccount: '...',
            feeModelProgramId: '...',
            feeOutputRegister: '...',
            riskEngineProgramId: '...',
            riskModelConfigurationAccount: '...',
            riskOutputRegister: '...',
            createRiskStateAccountDiscriminant: '...',
            findFeesDiscriminant: '...',
            findFeesDiscriminantLen: '...',
            validateAccountHealthDiscriminant: '...',
            validateAccountLiquidationDiscriminant: '...',
            validateAccountDiscriminantLen: '...',
            riskAndFeeBump: '...',
            vaultBump: '...',
            ewmaWindows: '...',
            maxMakerFeeBps: '...',
            maxTakerFeeBps: '...',
            minMakerFeeBps: '...',
            minTakerFeeBps: '...',
        }
        if (this.props.mpg) {
            mpg.name = dexterity.bytesToString(this.props.mpg?.mpg?.name);
            mpg.pubkey = this.props.mpg?.pubkey?.toString();
            // additional info
            mpg.authority = this.props.mpg?.mpg?.authority?.toBase58();
            mpg.successor = this.props.mpg?.mpg?.successor?.toBase58();
            mpg.feeCollector = this.props.mpg?.mpg?.feeCollector?.toBase58();
            mpg.feeModelConfigurationAccount = this.props.mpg?.mpg?.feeModelConfigurationAcct?.toBase58();
            mpg.feeModelProgramId = this.props.mpg?.mpg?.feeModelProgramId?.toBase58();
            mpg.feeOutputRegister = this.props.mpg?.mpg?.feeOutputRegister?.toBase58();
            mpg.riskEngineProgramId = this.props.mpg?.mpg?.riskEngineProgramId?.toBase58();
            mpg.riskModelConfigurationAccount = this.props.mpg?.mpg?.riskModelConfigurationAcct?.toBase58();
            mpg.riskOutputRegister = this.props.mpg?.mpg?.riskOutputRegister?.toBase58();
            mpg.vaultMint = this.props.mpg?.mpg?.vaultMint?.toBase58();
            mpg.createRiskStateAccountDiscriminant = JSON.stringify(this.props.mpg?.mpg?.createRiskStateAccountDiscriminant);
            mpg.findFeesDiscriminant = JSON.stringify(this.props.mpg?.mpg?.findFeesDiscriminant);
            mpg.findFeesDiscriminantLen = this.props.mpg?.mpg?.findFeesDiscriminantLen.toString();
            mpg.validateAccountHealthDiscriminant = JSON.stringify(this.props.mpg?.mpg?.validateAccountHealthDiscriminant);
            mpg.validateAccountLiquidationDiscriminant = JSON.stringify(this.props.mpg?.mpg?.validateAccountLiquidationDiscriminant);
            mpg.validateAccountDiscriminantLen = this.props.mpg?.mpg?.validateAccountDiscriminantLen.toString();
            mpg.riskAndFeeBump = this.props.mpg?.mpg?.riskAndFeeBump.toString();
            mpg.vaultBump = this.props.mpg?.mpg?.vaultBump.toString();
            mpg.ewmaWindows = JSON.stringify(this.props.mpg?.mpg?.ewmaWindows.map(w => w.toString()));
            mpg.maxMakerFeeBps = this.props.mpg?.mpg?.maxMakerFeeBps.toString();
            mpg.maxTakerFeeBps = this.props.mpg?.mpg?.maxTakerFeeBps.toString();
            mpg.minMakerFeeBps = this.props.mpg?.mpg?.minMakerFeeBps.toString();
            mpg.minTakerFeeBps = this.props.mpg?.mpg?.minTakerFeeBps.toString();
            mpg.collectedFees = dexterity.Fractional.From(this.props.mpg?.mpg?.collectedFees).toString();
            mpg.decimals = this.props.mpg?.mpg?.decimals.toString();
            mpg.sequenceNumber = this.props.mpg?.mpg?.sequenceNumber.toString();
            mpg.isKilled = this.props.mpg?.mpg?.isKilled;
            mpg.stakingFeeCollector = this.props.mpg?.mpg?.stakingFeeCollector.toString();
            mpg.createFeeStateAccountDiscriminant = this.props.mpg?.mpg?.createFeeStateAccountDiscriminant.toString();
            mpg.addressLookupTable = this.props.mpg?.mpg?.addressLookupTable.toString();
            let volume = dexterity.Fractional.Zero();
            for (const [_, { product }] of dexterity.Manifest.GetProductsOfMPG(this.props.mpg?.mpg)) {
                if (product.hasOwnProperty('combo')) {
                    continue;
                }
                volume = volume.add(dexterity.Fractional.From(dexterity.productToMeta(product).contractVolume));
            }
            mpg.volume = '$'+volume.toString(2, true);
        }
        return (
            <div className="MPG">
                <div className="MPGGrid">
                    <div>Name</div><div>{mpg.name}</div>
                    <div>Volume of Unexp. Products</div><div>{mpg.volume}</div>
                    <div>Public Key</div><div><Pubkey pubkey={mpg.pubkey} /></div>
                </div>
                <Products
                    books={this.props.books}
                    bookRecordingStates={this.props.bookRecordingStates}
                    onStartRecordingBook={this.props.onStartRecordingBook}
                    onStopRecordingBook={this.props.onStopRecordingBook}
                    onStreamBooks={this.props.onStreamBooks}
                    eventQueues={this.props.eventQueues}
                    onStreamEventQueue={this.props.onStreamEventQueue}
                    mpg={this.props.mpg ?? null}
                    manifest={this.props.manifest ?? null}
                />
                <button
                    onClick={() => { this.setState({ isAdditionalInfoShown: !this.state.isAdditionalInfoShown}); }}
                >
                    {this.state.isAdditionalInfoShown ? 'Hide' : 'Additional Info'}
                </button>
                {this.state.isAdditionalInfoShown && 
                 <div className="MPGGrid">
                     <div>Authority</div><div><Pubkey pubkey={mpg.authority} /></div>
                     <div>Successor</div><div><Pubkey pubkey={mpg.successor} /></div>
                     <div>Fee Collector</div><div><Pubkey pubkey={mpg.feeCollector} /></div>
                     <div>Fee Model Configuration Account</div><div><Pubkey pubkey={mpg.feeModelConfigurationAccount} /></div>
                     <div>Fee Model Program Id</div><div><Pubkey pubkey={mpg.feeModelProgramId} /></div>
                     <div>Fee Output Register</div><div><Pubkey pubkey={mpg.feeOutputRegister} /></div>
                     <div>Risk Engine Program Id</div><div><Pubkey pubkey={mpg.riskEngineProgramId} /></div>
                     <div>Risk Model Configuration Account</div><div><Pubkey pubkey={mpg.riskModelConfigurationAccount} /></div>
                     <div>Risk Output Register</div><div><Pubkey pubkey={mpg.riskOutputRegister} /></div>
                     <div>Vault Mint</div><div><Pubkey pubkey={mpg.vaultMint} /></div>
                     <div>Create Risk State Account Discriminant</div><div>{mpg.createRiskStateAccountDiscriminant}</div>
                     <div>Find Fees Discriminant</div><div>{mpg.findFeesDiscriminant}</div>
                     <div>Find Fees Discriminant Len</div><div>{mpg.findFeesDiscriminantLen}</div>
                     <div>Validate Account Health Discriminant</div><div>{mpg.validateAccountHealthDiscriminant}</div>
                     <div>Validate Account Liquidation Discriminant</div><div>{mpg.validateAccountLiquidationDiscriminant}</div>
                     <div>Validate Account Discriminant Len</div><div>{mpg.validateAccountDiscriminantLen}</div>
                     <div>Risk And Fee Bump</div><div>{mpg.riskAndFeeBump}</div>
                     <div>Vault Bump</div><div>{mpg.vaultBump}</div>
                     <div>Ewma Windows</div><div>{mpg.ewmaWindows}</div>
                     <div>Max Maker Fee Bps</div><div>{mpg.maxMakerFeeBps}</div>
                     <div>Max Taker Fee Bps</div><div>{mpg.maxTakerFeeBps}</div>
                     <div>Min Maker Fee Bps</div><div>{mpg.minMakerFeeBps}</div>
                     <div>Min Taker Fee Bps</div><div>{mpg.minTakerFeeBps}</div>
                     <div>Collected Fees (This Gets Swept)</div><div>{mpg.collectedFees}</div>
                     <div>Decimals</div><div>{mpg.decimals}</div>
                     <div>Sequence Number</div><div>{mpg.sequenceNumber}</div>
                     <div>Staking Fee Collector</div><div><Pubkey pubkey={mpg.stakingFeeCollector} /></div>
                     <div>Is Killed</div><div>{mpg.isKilled + ''}</div>
                     <div>Create Fee State Account Discriminant</div><div>{mpg.createFeeStateAccountDiscriminant}</div>
                     <div>Address Lookup Table</div><div><Pubkey pubkey={mpg.addressLookupTable} /></div>
                 </div>
                }
            </div>
        );
    }
}

export default MPG;
