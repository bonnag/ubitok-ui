import React from "react";
import { Alert, Button, ControlLabel, FormGroup, FormControl, HelpBlock, InputGroup } from "react-bootstrap";

import SendingButton from "./sending-button.js";

import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
//var BigNumber = UbiTokTypes.BigNumber;

class DepositEth extends React.Component {

  // props are:
  //   symbol
  //   ownAmount
  //   chosenAccount
  //   onDeposit - called with amount
  constructor(props) {
    super(props);
    this.state = {
      amount: "",
      error: ""
    };
  }

  handleAmountChange = (e) => {
    var v = e.target.value;
    this.setState((prevState, props) => {
      return {
        amount: v
      };
    });
  }

  getValidationResult = () => {
    let amount = this.state.amount;
    let decimals = 18; // TODO
    return UbiTokTypes.validateAmount(amount, decimals);
  }

  handleDepositClick = () => {
    let validation = this.getValidationResult();
    if (validation[0] === "error") {
      this.setState((prevState, props) => {
        return {
          error: validation[1]
        };
      });
    } else {
      this.handleAlertDismiss();
      this.props.onDeposit(this.state.amount);
    }
  }
  
  handleAlertDismiss = () => {
    this.setState((prevState, props) => {
      return {
        error: ""
      };
    });
  }
  
  render() {
    return (
      <form>
        <FormGroup controlId="step0">
          <ControlLabel>Step 0</ControlLabel>
          <HelpBlock>
            If you have {this.props.symbol} in another exchange/wallet,
            send them to your {this.props.chosenAccount} account first.
            Currently it has {this.props.ownAmount} {this.props.symbol}.
          </HelpBlock>
        </FormGroup>
        <FormGroup controlId="depAmount" validationState={this.getValidationResult()[0]}>
          <ControlLabel>Step 1</ControlLabel>
          <HelpBlock>
            This will send {this.props.symbol} from your account
            to the UbiTok.io smart contract for this product so you can buy tokens:
          </HelpBlock>
          <InputGroup>
            <InputGroup.Addon>Deposit Amount</InputGroup.Addon>
            <FormControl type="text" value={this.state.amount} onChange={this.handleAmountChange}/>
            <InputGroup.Addon>{this.props.symbol}</InputGroup.Addon>
          </InputGroup>
          <SendingButton bsStyle="primary" onClick={this.handleDepositClick} text={"Deposit " + this.props.symbol} />
          {(this.state.error === "" ? undefined : (
            <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss}>
              <p>{this.state.error}</p>
              <p><Button onClick={this.handleAlertDismiss}>OK</Button></p>
            </Alert>
          ))}
          <HelpBlock>
            Don't forget to leave some ETH in your account to pay for gas fees.
          </HelpBlock>
        </FormGroup>
      </form>
    );
  }
}

export default DepositEth;
