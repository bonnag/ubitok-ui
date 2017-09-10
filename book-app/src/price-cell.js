import React from "react";
import { } from "react-bootstrap";

class PriceCell extends React.Component {

  // props: onClick and price

  render() {
    return (
      <td onClick={this.handleClick} className={this.chooseClassNameForPrice(this.props.price)}>{this.props.price}</td>
    );
  }

  handleClick = () => {
    if (!this.props.onClick) return;
    let price = this.props.price;
    if (!price || !price.indexOf) return;
    // hmm, should use UbiTokTypes really
    let sepPos = price.indexOf('@');
    if (sepPos < 0) return;
    let priceOnly = price.substr(sepPos + 2);
    this.props.onClick(priceOnly);
  }

  chooseClassNameForPrice = (price) => {
    if (price.startsWith("Buy")) {
      return "buyPrice";
    } else if (price.startsWith("Sell")) {
      return "sellPrice";
    } else {
      return "invalidPrice";
    }
  }

}

export { PriceCell as default };
