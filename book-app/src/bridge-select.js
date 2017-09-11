// Choose how to connect to Ethereum network.

import React from "react";
import { Button, Modal, Nav, NavItem, FormGroup, InputGroup, FormControl, HelpBlock } from "react-bootstrap";

import GuestImage from "./bridge-guest-small.png";
import MetaMaskImage from "./bridge-metamask-small.png";
import ManualImage from "./bridge-mew-small.png";

class BridgeSelect extends React.Component {

  // TODO - we probably oughta remember this via localstorage/cookie

  // show = true/false, onDone = callback
  constructor(props) {
    super(props);
    this.state = {
      selectedKey: undefined,
      myEthAddress: ""
    };
  }

  handleSelect = (key) => {
    this.setState((prevState, props) => {
      return {
        selectedKey: key
      };
    });
  }

  handleDone = () => {
    // TODO - yuk - ugly window.alert dialogs
    if (!this.state.selectedKey) {
      alert("Please choose one option for connecting to Ethereum first ...");
      return;
    }
    let validation = this.getMyEthAddressValidationResult(true);
    if (validation[0] === "error") {
      alert("Please fix the problem with the chosen option first:\n" + validation[1]);
      return;
    }
    this.props.onDone(this.state.selectedKey, this.state.myEthAddress.trim());
  }

  handleMyEthAddressChange = (e) => {
    let v = e.target.value;
    this.setState((prevState, props) => {
      return {
        myEthAddress: v
      };
    });
  }

  getMyEthAddressValidationResult = (strict) => {
    if (this.state.selectedKey !== "manual") {
      return [undefined, undefined];
    }
    let candidate = this.state.myEthAddress.trim();
    if (candidate.match(/^(0x)?[0-9A-Fa-f]{40}$/)) {
      return ["success", undefined];
    }
    if (candidate.match(/^(0x)?[0-9A-Fa-f]{0,39}$/)) {
      if (strict) {
        return ["error", "No Ethereum address entered."];
      } else {
        return ["warning", undefined];
      }
    }
    return ["error", "That does not look like a valid Ethereum address (should be digits and letters a to f)."];
  }

  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleDone}>
        <Modal.Header closeButton>
          <Modal.Title>How should UbiTok.io send Ethereum transactions?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Nav bsStyle="pills" stacked activeKey={this.state.selectedKey} onSelect={this.handleSelect}>
            <NavItem eventKey="guest">
              <img src={GuestImage} style={{float:"left", marginRight:"8px"}} alt=""/>
              Don't Send - View Only.<br/>
              You won't be able to make payments or place orders.
              <div style={{clear: "both"}}/>
            </NavItem>
            <NavItem eventKey="metamask">
              <img src={MetaMaskImage} style={{float:"left", marginRight:"8px"}} alt=""/>
              Use my <b>MetaMask</b> Chrome Extension (or Mist Wallet).<br/>
              This gives the best experience - but you need to install MetaMask.
              <div style={{clear: "both"}}/>
            </NavItem>
            <NavItem eventKey="manual">
              <img src={ManualImage} style={{float:"left", marginRight:"8px"}} alt=""/>
              Tell me what to send via <b>MyEtherWallet</b> (or other manual client).<br/>
              Enter the address you will use so we can show your balances and orders:
              <FormGroup controlId="bridgeSelectMyEthAddress" validationState={this.getMyEthAddressValidationResult()[0]}>
                <InputGroup>
                  <InputGroup.Addon>Eth Address</InputGroup.Addon>
                  <FormControl
                    type="text"
                    value={this.state.myEthAddress}
                    placeholder="0x"
                    onChange={this.handleMyEthAddressChange}
                  />
                </InputGroup>
                <HelpBlock>{this.getMyEthAddressValidationResult()[1]}</HelpBlock>
              </FormGroup>
              <div style={{clear: "both"}}/>
            </NavItem>
          </Nav>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.handleDone}>Done</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default BridgeSelect;
