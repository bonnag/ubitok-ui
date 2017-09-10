// Most cryptocurrencies have many more digits of precision than
// traditional currencies - but humans aren't great at dealing
// with a screen full of figures like 123456.789012345.
// Display the number rounded down if necessary (but with full
// amount in a tooltip).

import React from "react";
import { } from "react-bootstrap";

import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
let BigNumber = UbiTokTypes.BigNumber;

class MoneyAmount extends React.Component {

  // props: displayAmount

  constructor(props) {
    super(props);
  }

  render() {
    let displayAmount = this.props.displayAmount;
    let roundedAmount = this.roundDownDisplay(displayAmount);
    if (displayAmount === roundedAmount) {
      return (
        <span>{displayAmount}</span>
      );
    } else {
      return (
        <span title={displayAmount}>{roundedAmount}&hellip;</span>
      );
    }
  }

  roundDownDisplay = (displayAmount) => {
    var num;
    try {
      num = new BigNumber(displayAmount);
    } catch (e) {
      return displayAmount;
    }
    var withReducedPrecision;
    if (num.abs().gte(100000)) {
      withReducedPrecision = num.round(1, BigNumber.ROUND_DOWN);
    } else {
      withReducedPrecision = num.toPrecision(6, BigNumber.ROUND_DOWN);
    }
    let withoutExponent = new BigNumber(withReducedPrecision).toFixed();
    let roundedAmount = withoutExponent;
    let equivalent = (0 === num.cmp(roundedAmount));
    if (equivalent) {
      return displayAmount;
    }
    return roundedAmount;
  }
  
}

export { MoneyAmount as default };
