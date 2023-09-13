import React from "react";
import MPGSelector from './MPGSelector.js';
import RPCSelector from './RPCSelector.js';
import './Header.css';

class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    getManifestRPCName() {
        const rpc = this.props.manifest.fields.rpc;
        let rpcName = rpc; // if rpc's name not found in map, then go with raw rpc
        for (let [name, v] of this.props.rpcs) {
            if (v === rpc) {
                rpcName = name;
                break;
            }
        }
        return rpcName;
    }

    getManifestCacheTime() {
        return new Date(this.props.manifest.fields.creationTime);
    }

    getManifestCacheTimeString() {
        const cacheDate = this.getManifestCacheTime();
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

    getManifestStatusString() {
        if (this.props.manifest?.fields) {
            return 'Currently displaying the "' + this.getManifestRPCName() + '" manifest which was cached ' + this.getManifestCacheTimeString();
        }
        return 'No manifest has been fetched yet.';
    }

    render() {
        let [manifestString, manifestTitleString] = ['', ''];
        if (this.props.isFetchingManifest) {
            manifestString += ' Fetching data from chain... ';
            manifestTitleString = '(this can take a while on devnet)';
            manifestString += this.getManifestStatusString();
        } else if (!this.props.isValidRPC) {
            manifestString = 'Invalid RPC. ';
            manifestTitleString = '(make sure you specify http:// or https://)';
            manifestString += this.getManifestStatusString();
        } else { // not fetching and is valid
            manifestString = 'Fully up to date.';
            if (this.props.manifest?.fields) {
                manifestString += ' Cached the "' + this.props.selectedRPCName + '" manifest ' + this.getManifestCacheTimeString();
                manifestTitleString = this.getManifestCacheTime() + '';
            }
        }
        return (
            <div className="Header">
                <div class="HeaderFirstRow">
                    <div title={manifestTitleString}>{manifestString.trim()}</div>
                </div>
                <div className="HeaderSecondRow">
                    <RPCSelector
                        rpcs={this.props.rpcs}
                        selectedRPC={this.props.selectedRPC}
                        selectedRPCName={this.props.selectedRPCName}
                        isValid={this.props.isValidRPC}
                        onChange={this.props.onRpcChange}
                    />
                    <MPGSelector
                        manifest={this.props.manifest}
                        selectedMPG={this.props.selectedMPG}
                        onChange={this.props.onMpgChange}
                    />
                </div>
            </div>
        );
    }
}

export default Header;
