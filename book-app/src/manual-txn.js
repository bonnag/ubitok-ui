// Choose how to connect to Ethereum network.

import React from "react";
import { Button, ButtonToolbar, Modal, FormGroup, ControlLabel, FormControl, InputGroup, Alert } from "react-bootstrap";
import { NotificationManager } from "react-notifications";
import copyToClipboard from "copy-to-clipboard";

class ManualTxn extends React.Component {

  // show
  // goalDesc
  // appearDesc
  // fromAddress
  // toAddress
  // amountToSend
  // gasLimit
  // data
  // onDone
  // chosenNetworkId
  // chosenNetworkName
  constructor(props) {
    super(props);
  }

  handleDone = () => {
    this.props.onDone(true);
  }

  handleCancel = () => {
    this.props.onDone(false);
  }

  handleValueClick = (value) => {
    let workedSilently = copyToClipboard(value);
    if (workedSilently) {
      NotificationManager.success("Copied to clipboard");
    }
  }

  CopyOnlyFormControl = (props) =>
  <FormControl className="copyOnlyFormControl" {...props} 
    onChange={() => {}} onClick={() => this.handleValueClick(props.value)} />

  render() {

    // defining inside render() is a bad idea
    const CopyOnlyFormControl = this.CopyOnlyFormControl;

    return (
      <Modal show={this.props.show} onHide={this.handleDone}>
        <Modal.Header closeButton>
          <Modal.Title>Here's what you need to send ...</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            To {this.props.goalDesc}, you'll need to send an Ethereum transaction from your account {this.props.fromAddress}.
          </p>
          <p>
            Here are the details you need to copy into <b><a href="https://www.myetherwallet.com/#send-transaction">MyEtherWallet Send Ether &amp; Tokens</a></b>:
          </p>
          {this.props.chosenNetworkId !== "1" ? (
          <Alert bsStyle="warning">
          <b>Careful</b> - Make sure you choose the {this.props.chosenNetworkName}.
          </Alert>
          ) : undefined}
          <p>
            <i>Tip: Clicking a value below will copy it to your clipboard automatically.</i>
          </p>
          <form>
            <FormGroup controlId="toAddress">
              <ControlLabel>To Address</ControlLabel>
              <CopyOnlyFormControl type="text" value={this.props.toAddress} />
            </FormGroup>
            <FormGroup controlId="amountToSend">
              <ControlLabel>Amount to Send</ControlLabel>
              <InputGroup>
                <CopyOnlyFormControl type="text" value={this.props.amountToSend} />
                <InputGroup.Addon>ETH</InputGroup.Addon>
              </InputGroup>
            </FormGroup>
            <FormGroup controlId="gasLimit">
              <ControlLabel>Gas Limit</ControlLabel>
              <CopyOnlyFormControl type="text" value={this.props.gasLimit} />
            </FormGroup>
            <FormGroup controlId="data">
              <ControlLabel>Data (Advanced)</ControlLabel>
              <CopyOnlyFormControl componentClass="textarea" rows="5" value={this.props.data} />
            </FormGroup>
          </form>
          <p>Once you've sent the transaction from MyEtherWallet, your {this.props.appearDesc} should appear on UbiTok.io within a minute or so.</p>
          <p>
            <i>Tip 2: Have you tried the MetaMask Chrome extension - it makes using UbiTok.io much easier?</i>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <ButtonToolbar className="pull-right">
            <Button bsStyle="danger" onClick={this.handleCancel}>Cancel, I changed my mind</Button>
            <Button bsStyle="primary" onClick={this.handleDone}>OK, I sent it!</Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default ManualTxn;
