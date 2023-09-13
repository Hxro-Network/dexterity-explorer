import React from "react";
import './Scrollable.css';

class Scrollable extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const cols = this.props.cols ?? 16;
        return (
            <textarea readOnly={true} className="Scrollable" rows={1} cols={cols}>
                {this.props.text}
            </textarea>
        );
    }
}

export default Scrollable;
