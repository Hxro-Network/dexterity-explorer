import React from "react";
import dexterity from '@hxronetwork/dexterity-ts';
import './TRGSelector.css';

const INVALID_TRG_STYLE = {
    border: 'solid 1px red',
    boxShadow: '1px 1px 5px 1px red',
    color: 'red',
};

class TRGSelector extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const pastTrgs = [];
        for (const trg of this.props.pastTrgs) {
            pastTrgs.push(
                <option
                    key={trg}
                    value={trg}
                    selected={trg === this.props.selectedTRG}
                >
                    {trg}
                </option>
            );
        }
        return (
            <div className="TRGSelector">
                <div>
                    <input type="text"
                           onChange={e => this.props.onChange(e.target.value)}
                           placeholder="Paste a TRG or wallet"
                           value={this.props.selectedTRGName}
                           list={"explore-dexterity-past-trgs"}
                           isValid={this.props.isValid || this.props.isFetching}
                           style={(this.props.isValid || this.props.isFetching) ? {} : INVALID_TRG_STYLE}
                    />
                    <datalist id={"explore-dexterity-past-trgs"} name={"explore-dexterity-past-trgs"} list={"explore-dexterity-past-trgs"}>
                        {pastTrgs.length > 0 ? pastTrgs : (<option disabled selected>No TRGs Available</option>)}
                    </datalist>
                </div>
            </div>
        );
    }
}

export default TRGSelector;
