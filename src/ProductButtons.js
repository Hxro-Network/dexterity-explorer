import React from "react";
import './Products.css';

class ProductButtons extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <div className="ProductButtons">
                <button
                    className="ProductDetailsButton"
                    onClick={_ => { this.props.onDetailsButton(this.props.productKeyStr) }}>
                    {this.props.isDetailsShown ? 'Hide Details' : 'More Details'}
                </button>
                <button
                    className="ProductBookButton"
                    onClick={_ => { this.props.onBookButton(this.props.orderbookStr) }}>
                    {this.props.isBookShown ? 'Hide Book' : 'Show Book'}
                </button>
            </div>
        );
    }
}

export default ProductButtons;
