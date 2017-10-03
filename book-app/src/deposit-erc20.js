import React from "react";
import { Alert, Button, FormGroup, FormControl, ControlLabel, HelpBlock, InputGroup } from "react-bootstrap";

import SendingButton from "./sending-button.js";

import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
//var BigNumber = UbiTokTypes.BigNumber;

class DepositErc20 extends React.Component {

  // props are:
  //   symbol
  //   chosenAccount
  //   ownAmount
  //   approvedAmount
  //   onApprove - called with new approval amount
  //   onCollect - called with no args
  constructor(props) {
    super(props);
    this.state = {
      newApprovedAmount: "",
      error: ""
    };
  }

  handleNewApprovedAmountChange = (e) => {
    var v = e.target.value;
    this.setState((prevState, props) => {
      return {
        newApprovedAmount: v
      };
    });
  }

  getApprovalValidationResult = () => {
    let amount = this.state.newApprovedAmount;
    let decimals = 18; // TODO
    return UbiTokTypes.validateAmount(amount, decimals);
  }

  handleApproveClick = () => {
    let validation = this.getApprovalValidationResult();
    if (validation[0] === "error") {
      this.setState((prevState, props) => {
        return {
          error: validation[1]
        };
      });
    } else {
      this.handleAlertDismiss();
      this.props.onApprove(this.state.newApprovedAmount);
    }
  }
  
  handleCollectClick = () => {
    this.props.onCollect();
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
            If you have {this.props.symbol} tokens in another exchange/wallet,
            withdraw/transfer them to your {this.props.chosenAccount} account first.
            Currently it has {this.props.ownAmount} {this.props.symbol}.
          </HelpBlock>
        </FormGroup>
        <FormGroup controlId="currentApproval">
          <ControlLabel>Step 1</ControlLabel>
          <HelpBlock>
            You need to <i>approve</i> the {this.props.symbol} book contract to allow it to receive your tokens.
            The <b>current approved amount is {this.props.approvedAmount} {this.props.symbol}</b>.
          </HelpBlock>
          <HelpBlock>
            This is where you choose how much to deposit:
          </HelpBlock>
        </FormGroup>
        <FormGroup controlId="approval" validationState={this.getApprovalValidationResult()[0]}>
          <InputGroup>
            <InputGroup.Addon>New Approved Amount</InputGroup.Addon>
            <FormControl type="text" value={this.state.newApprovedAmount} onChange={this.handleNewApprovedAmountChange}/>
            <InputGroup.Addon>{this.props.symbol}</InputGroup.Addon>
          </InputGroup>
          <SendingButton bsStyle="primary" onClick={this.handleApproveClick} text="Set Approved Amount" />
          { (this.state.error === "" ? undefined : (
            <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss}>
              <p>{this.state.error}</p>
              <p><Button onClick={this.handleAlertDismiss}>OK</Button></p>
            </Alert>
          ))}
        </FormGroup>
        <FormGroup controlId="collection">
          <ControlLabel>Step 2</ControlLabel>
          <HelpBlock>
            Once the current approved amount is correct, tell the book contract to <i>collect</i> the {this.props.symbol} tokens you approved:
          </HelpBlock>
          <SendingButton bsStyle="primary" onClick={this.handleCollectClick} text={"Collect Approved " + this.props.symbol} />
        </FormGroup>
      </form>
    );
  }
}

export default DepositErc20;
