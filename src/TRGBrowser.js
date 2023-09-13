import React from "react";
import './TRGBrowser.css';
import TRGSelector from './TRGSelector.js';
import TRG from './TRG.js';
import Wallet from './Wallet.js';

class TRGBrowser extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <div className="TRGBrowser">
                <TRGSelector
                    isFetching={this.props.isFetchingTRG}
                    isValid={this.props.isValidTRG}
                    selectedTRG={this.props.selectedTRG}
                    selectedTRGObject={this.props.selectedTRGObject}
                    pastTrgs={this.props.pastTrgs}
                    onChange={this.props.onTrgChange}
                    manifest={this.props.manifest}
                />
                <TRG
                    isFetching={this.props.isFetchingTRG}
                    isValid={this.props.isValidTRG}
                    updateTime={this.props.trgUpdateTime}
                    trgKey={this.props.selectedTRG}
                    trgObject={this.props.selectedTRGObject}
                    trader={this.props.selectedTrader}
                    manifest={this.props.manifest}
                    timeTravelToDate={this.props.timeTravelToDate}
                />
                <Wallet
                    isFetchingWallet={this.props.isFetching}
                    selectedWallet={this.props.selectedWallet}
                    walletTrgs={this.props.walletTrgs}
                    manifest={this.props.manifest}
                />                
            </div>
        );
    }
}

export default TRGBrowser;
