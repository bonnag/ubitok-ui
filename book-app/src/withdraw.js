import React from "react";
import { Alert, Button, FormGroup, FormControl, HelpBlock, InputGroup } from "react-bootstrap";

import SendingButton from "./sending-button.js";

import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
//var BigNumber = UbiTokTypes.BigNumber;

class Withdraw extends React.Component {

  // props are:
  //   symbol
  //   chosenAccount
  //   onWithdraw - called with amount
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

  handleWithdrawClick = () => {
    let validation = this.getValidationResult();
    if (validation[0] === "error") {
      this.setState((prevState, props) => {
        return {
          error: validation[1]
        };
      });
    } else {
      this.handleAlertDismiss();
      this.props.onWithdraw(this.state.amount);
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
        <FormGroup controlId="transferAmount">
          <HelpBlock>
            This will send {this.props.symbol} held for you
            by the book contract to your {this.props.chosenAccount} account.
          </HelpBlock>
          <InputGroup>
            <InputGroup.Addon>Withdrawal Amount</InputGroup.Addon>
            <FormControl type="text" value={this.state.amount} onChange={this.handleAmountChange}/>
            <InputGroup.Addon>{this.props.symbol}</InputGroup.Addon>
          </InputGroup>
          <SendingButton bsStyle="warning" onClick={this.handleWithdrawClick} text={"Withdraw " + this.props.symbol} />
          <FormControl.Feedback>
            {(this.state.error === "" ? undefined : (
              <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss}>
                <p>{this.state.error}</p>
                <p><Button onClick={this.handleAlertDismiss}>OK</Button></p>
              </Alert>
            ))}
          </FormControl.Feedback>
        </FormGroup>
      </form>
    );
  }
}

export default Withdraw;
