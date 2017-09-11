import React from "react";
import { Alert, Button, ButtonToolbar, FormGroup, FormControl, ControlLabel, HelpBlock, InputGroup } from "react-bootstrap";

import SendingButton from "./sending-button.js";

import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
var BigNumber = UbiTokTypes.BigNumber;

class CreateOrder extends React.Component {

  // props are:
  //   direction - Buy / Sell
  //   pairInfo
  //   balances
  //   bridgeStatus
  //   onPlace - called with orderId, price, sizeBase, terms
  constructor(props) {
    super(props);
    this.state = {
      "amountBase": "",
      "price": "",
      "costCntr": "",
      "returnCntr": "",
      "terms": "GTCNoGasTopup",
      "error": ""
    };
    this.props.priceClickEventEmitter.subscribe('createOrder' + this.props.direction, this.setPrice);
  }

  formatBase = (rawAmount) => {
    return UbiTokTypes.decodeBaseAmount(rawAmount);
  }

  formatCntr = (rawAmount) => {
    return UbiTokTypes.decodeCntrAmount(rawAmount);
  }

  getOverallValidationResult = () => {
    let individualResults = [
      this.getCreateOrderAmountValidationResult(),
      this.getCreateOrderPriceValidationResult(),
      ( this.props.direction === "Buy" ?
         this.getCreateOrderCostValidationResult() :
         this.getCreateOrderProceedsValidationResult() ),
      this.getCreateOrderTermsValidationResult()
    ];
    // TODO - check if eth too low to pay gas? or do that globally?
    if (individualResults.filter((r) => r[0] === "error").length > 0) {
      return ["error", "Please correct items highlighted (in red) above first."];
    } else if (!this.props.bridgeStatus.mightSendTransactions) {
      return ["error", "Orders cannot be placed in View Only mode - reload page to connect to Ethereum network again."];
    } else if (!this.props.bridgeStatus.canSendTransactions) {
      return ["error", "Please check you have an unlocked Ethereum account first."];
    } else {
      return ["success"];
    }
  }

  // TODO - move some of this logic to UbiTokTypes?
  getCreateOrderAmountValidationResult = () => {
    let amount = this.state.amountBase;
    let terms = this.state.terms;
    if (amount === undefined || amount.trim() === "") {
      return ["error", "Amount is blank"];
    }
    let number = new BigNumber(NaN);
    try {
      number = new BigNumber(amount);
    } catch (e) {
      // will detect NaN in next step
    }
    if (number.isNaN() || !number.isFinite()) {
      return ["error", "Amount does not look like a regular number"];
    }
    if (number.decimalPlaces() >= UbiTokTypes.baseDecimals || number.decimalPlaces() > 10) {
      return ["error", "Amount has too many decimal places"];
    }
    let rawAmountBase = UbiTokTypes.encodeBaseAmount(amount);
    let minInitialSize = this.props.pairInfo.base.minInitialSize;
    if (rawAmountBase.lt(UbiTokTypes.encodeBaseAmount(minInitialSize))) {
      return ["error", "Amount is too small, must be at least " + minInitialSize];
    }
    if (rawAmountBase.gte("1e30")) {
      return ["error", "Amount is too large"];
    }
    if (this.props.direction === "Sell") {
      let availableBalance = this.props.balances.exchangeBase;
      if (availableBalance !== "" && 
          rawAmountBase.gt(UbiTokTypes.encodeBaseAmount(availableBalance))) {
        return ["error", "Your Book Contract " + this.props.pairInfo.base.symbol +
          " balance is too low, try a smaller amount or deposit more funds"];
      }
    }
    let helpMsg = undefined;
    if (this.props.direction === "Buy" && terms !== "MakerOnly") {
      let rawFees = rawAmountBase.times("0.0005");
      helpMsg = "A fee of up to " + UbiTokTypes.decodeBaseAmount(rawFees) + " " + this.props.pairInfo.base.symbol + " may be deducted";
    }
    return ["success", helpMsg];
  }

  getCreateOrderPriceValidationResult = () => {
    let pricePart = this.state.price;
    let errorAndResult = UbiTokTypes.parseFriendlyPricePart(this.props.direction, pricePart);
    if (errorAndResult[0]) {
      let error = errorAndResult[0];
      let helpMsg = "Price " + error.msg;
      if (error.suggestion) {
        helpMsg += ". Perhaps try " + error.suggestion + "?";
      }
      return ["error", helpMsg];
    }
    return ["success", undefined];
  }

  getCreateOrderCostValidationResult = () => {
    let amount = this.state.amountBase;
    let pricePart = this.state.price;
    let cost = new BigNumber(NaN);
    try {
      cost = (new BigNumber(amount)).times(new BigNumber(pricePart));
    } catch (e) {
      // will detect NaN in next step
    }
    if (cost.isNaN()) {
      return [null, undefined, "N/A"];
    }
    let displayedCost = cost.toFixed();
    let rawCost = UbiTokTypes.encodeCntrAmount(cost);
    let minInitialSize = this.props.pairInfo.cntr.minInitialSize;
    if (rawCost.lt(UbiTokTypes.encodeCntrAmount(minInitialSize))) {
      return ["error", "Cost is too small (must be at least " + minInitialSize + "), try a larger amount", displayedCost];
    }
    if (rawCost.gte("1e32")) {
      return ["error", "Cost is too large, try a smaller amount"];
    }
    let availableBalance = this.props.balances.exchangeCntr;
    if (availableBalance !== "" &&
        rawCost.gt(UbiTokTypes.encodeCntrAmount(availableBalance))) {
      return ["error", "Your Book Contract " + this.props.pairInfo.cntr.symbol +
        " balance is too low, try a smaller amount or deposit more funds" +
        " (remember to leave a little in your account for gas)", displayedCost];
    }
    return ["success", undefined, displayedCost];
  }

  getCreateOrderProceedsValidationResult = () => {
    let amount = this.state.amountBase;
    let pricePart = this.state.price;
    let terms = this.state.terms;
    let proceeds = new BigNumber(NaN);
    try {
      proceeds = (new BigNumber(amount)).times(new BigNumber(pricePart));
    } catch (e) {
      // will detect NaN in next step
    }
    if (proceeds.isNaN()) {
      return [null, undefined, "N/A"];
    }
    let displayedProceeds = proceeds.toFixed();
    let rawProceeds = UbiTokTypes.encodeCntrAmount(proceeds);
    let minInitialSize = this.props.pairInfo.cntr.minInitialSize;
    if (rawProceeds.lt(UbiTokTypes.encodeCntrAmount(minInitialSize))) {
      return ["error", "Proceeds are too small (must be at least " + minInitialSize + "), try a larger amount", displayedProceeds];
    }
    if (rawProceeds.gte("1e32")) {
      return ["error", "Proceeds are too large, try a smaller amount"];
    }
    let helpMsg = undefined;
    if (terms !== "MakerOnly") {
      let rawFees = rawProceeds.times("0.0005");
      helpMsg = "A fee of up to " + UbiTokTypes.decodeCntrAmount(rawFees) + " " + this.props.pairInfo.cntr.symbol + " may be deducted";
    }
    return ["success", helpMsg, displayedProceeds];
  }
  
  getCreateOrderTermsValidationResult = () => {
    // TODO - check if e.g. maker only will take, or others will have crazee number of matches?
    return ["success", undefined];
  }
  
  handleCreateOrderAmountBaseChange = (e) => {
    var v = e.target.value;
    this.setState((prevState, props) => {
      return {
        amountBase: v
      };
    });
  }

  handleCreateOrderPriceChange = (e) => {
    var v = e.target.value;
    this.setState((prevState, props) => {
      return {
        price: v
      };
    });
  }

  handleCreateOrderTermsChange = (e) => {
    var v = e.target.value;
    this.setState((prevState, props) => {
      return {
        terms: v
      };
    });
  }
  
  handlePlaceOrder = () => {
    let validationResult = this.getOverallValidationResult();
    if (validationResult[0] === "error") {
      this.setState((prevState, props) => {
        return {
          error: validationResult[1]
        };
      });
      return;
    }
    var orderId = UbiTokTypes.generateDecodedOrderId();
    var price = this.props.direction + " @ " + this.state.price;
    var sizeBase = this.state.amountBase;
    var terms = this.state.terms;
    this.props.onPlace(orderId, price, sizeBase, terms);
  }

  handleAlertDismiss = () => {
    this.setState((prevState, props) => {
      return {
        error: ""
      };
    });
  }

  // used for populating from order book
  setPrice = (price) => {
    this.setState((prevState, props) => {
      return {
        price: price
      };
    });
  }

  render() {
    return (
      <div>
        <FormGroup controlId="createOrderAmount" validationState={this.getCreateOrderAmountValidationResult()[0]}>
          <InputGroup>
            <InputGroup.Addon>Amount</InputGroup.Addon>
            <FormControl
              type="text"
              value={this.state.amountBase}
              placeholder={"How many " + this.props.pairInfo.base.symbol + " to " + this.props.direction.toLowerCase()}
              onChange={this.handleCreateOrderAmountBaseChange}
            />
            <InputGroup.Addon>{this.props.pairInfo.base.symbol}</InputGroup.Addon>
          </InputGroup>
          <HelpBlock>{this.getCreateOrderAmountValidationResult()[1]}</HelpBlock>
        </FormGroup>
        <FormGroup controlId="createOrderPrice" validationState={this.getCreateOrderPriceValidationResult()[0]}>
          <InputGroup>
            <InputGroup.Addon>Price</InputGroup.Addon>
            <InputGroup.Addon>{this.props.direction} @ </InputGroup.Addon>
            <FormControl
              type="text"
              value={this.state.price}
              placeholder={"How many " + this.props.pairInfo.cntr.symbol + " per " + this.props.pairInfo.base.symbol}
              onChange={this.handleCreateOrderPriceChange}
            />
          </InputGroup>
          <HelpBlock>{this.getCreateOrderPriceValidationResult()[1]}</HelpBlock>
        </FormGroup>
        { (this.props.direction === "Buy") ? (
          <FormGroup controlId="createOrderCost" validationState={this.getCreateOrderCostValidationResult()[0]}>
            <InputGroup>
              <InputGroup.Addon>Cost</InputGroup.Addon>
              <FormControl type="text" value={this.getCreateOrderCostValidationResult()[2]} readOnly onChange={()=>{}}/>
              <InputGroup.Addon>{this.props.pairInfo.cntr.symbol}</InputGroup.Addon>
            </InputGroup>
            <HelpBlock>{this.getCreateOrderCostValidationResult()[1]}</HelpBlock>
          </FormGroup>
        ) : (
          <FormGroup controlId="createOrderProceeds" validationState={this.getCreateOrderProceedsValidationResult()[0]}>
            <InputGroup>
              <InputGroup.Addon>Proceeds</InputGroup.Addon>
              <FormControl type="text" value={this.getCreateOrderProceedsValidationResult()[2]} readOnly onChange={()=>{}}/>
              <InputGroup.Addon>{this.props.pairInfo.cntr.symbol}</InputGroup.Addon>
            </InputGroup>
            <HelpBlock>{this.getCreateOrderProceedsValidationResult()[1]}</HelpBlock>
          </FormGroup>
        ) }
        <FormGroup controlId="createOrderTerms" validationState={this.getCreateOrderTermsValidationResult()[0]}>
          <ControlLabel>Terms</ControlLabel>
          <FormControl componentClass="select" value={this.state.terms} onChange={this.handleCreateOrderTermsChange}>
            <option value="GTCNoGasTopup">Good Till Cancel (no gas topup)</option>
            <option value="GTCWithGasTopup">Good Till Cancel (gas topup enabled)</option>
            <option value="ImmediateOrCancel">Immediate Or Cancel</option>
            <option value="MakerOnly">Maker Only</option>
          </FormControl>
          <HelpBlock>{this.getCreateOrderTermsValidationResult()[1]}</HelpBlock>
        </FormGroup>
        <FormGroup>
          { (this.state.error === "" ? undefined : (
          <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss}>
            <p>{this.state.error}</p>
            <p><Button onClick={this.handleAlertDismiss}>OK</Button></p>
          </Alert>
          ))}
          <ButtonToolbar>
            <SendingButton bsStyle={(this.props.direction === "Buy") ? "primary" : "warning"} onClick={this.handlePlaceOrder} text={"Place " + this.props.direction + " Order"} />
          </ButtonToolbar>
          <HelpBlock>
            Please read our <a target="_blank" href="http://ubitok.io/trading-rules" rel="noopener noreferrer">Trading Rules</a> for help and terms.
          </HelpBlock>
        </FormGroup>
      </div>
    );
  }
}

export default CreateOrder;
