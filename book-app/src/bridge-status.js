import React from "react";
import { Panel, Row, Col } from "react-bootstrap";

import metamaskLogo from "./metamask.png";
import mistLogo from "./mist.png";

import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
let BigNumber = UbiTokTypes.BigNumber;


class BridgeStatus extends React.Component {

  render = () => {
    return (
      <div>{
        (!this.props.bridgeStatus.bridgeMode) ? (
          <Panel header="Waiting to connect to Ethereum network ..." bsStyle="info">
            <p>Waiting to find out how to connect to the Ethereum network ...</p>
          </Panel>
        ) : (!this.props.bridgeStatus.canReadBook && this.props.bridgeStatus.withinGracePeriod) ? (
          <Panel header="Connecting to Ethereum network ..." bsStyle="info">
            <p>Waiting for MetaMask, Mist, INFURA or other web3 provider to initialise ...</p>
          </Panel>
        ) : !this.props.bridgeStatus.web3Present ? (
          <Panel header="No Ethereum Connection" bsStyle="danger">
            <p>UbiTok.io needs to connect to the Ethereum network via a local client, but could not find one.</p>
            <p>We suggest using one of the following clients to connect to Ethereum:</p>
            <Row>
              <Col sm={6}>
                <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
                  <h4>Metamask Chrome Extension</h4>
                  <img src={metamaskLogo} className="Metamask-logo" alt="Metamask" />
                </a>
              </Col>
              <Col sm={6}>
                <a href="https://github.com/ethereum/mist/releases" target="_blank" rel="noopener noreferrer">
                  <h4>Mist Browser</h4>
                  <img src={mistLogo} className="Mist-logo" alt="Mist" />
                </a>
              </Col>
            </Row>
          </Panel>
        ) : this.props.bridgeStatus.unsupportedNetwork ? (
          <Panel header="Unsupported Ethereum Network" bsStyle="danger">
            <p>This UbiTok.io book is only available on the {this.props.bridgeStatus.targetNetworkName}.</p>
            <p>Try changing Ethereum Network in your Ethereum Client (e.g. Metamask, Mist).</p>
          </Panel>
        ) : this.props.bridgeStatus.networkChanged ? (
          <Panel header="Ethereum Network Changed" bsStyle="danger">
            <p>You seem to have changed Ethereum Network.</p>
            <p>Try changing Ethereum Network in your Ethereum Client (e.g. MetaMask, Mist)
              back to {this.props.bridgeStatus.chosenSupportedNetworkName}, or reload this page to pick up the new network.</p>
          </Panel>
        ) : this.props.bridgeStatus.accountLocked && this.props.bridgeStatus.mightReadAccountOrders ? (
          <Panel header="Ethereum Account Locked" bsStyle="danger">
            <p>UbiTok.io needs to know which Ethereum account to use.</p>
            <p>Try unlocking your Ethereum Client (e.g. MetaMask, Mist). You might need to reload this page after unlocking.</p>
          </Panel>
        ) : this.props.bridgeStatus.accountChanged ? (
          <Panel header="Ethereum Account Changed" bsStyle="danger">
            <p>You seem to have changed Ethereum Account.</p>
            <p>Try changing Ethereum Account in your Ethereum Client (e.g. Metamask, Mist)
              back to {this.props.bridgeStatus.chosenAccount}, or reload this page to pick up the new account.</p>
          </Panel>
        ) : !this.props.bridgeStatus.mightReadAccountOrders ? (
          <Panel header="View Only Mode" bsStyle="info">
            <p>You are connected to the Ethereum network as a guest, so you will not be able to make payments or place orders.</p>
            <p>Reload this page to choose a different way to connect to the Ethereum network.</p>
          </Panel>
        ) : (!this.props.bridgeStatus.canReadBook || !this.props.bridgeStatus.canReadAccountOrders) ? (
          <Panel header="Unknown Ethereum Connection Problem" bsStyle="danger">
            <p>Some unusual problem has occurred preventing UbiTok.io connecting to the Ethereum Network.</p>
            <p>Try reloading this page, or contact help@ubitok.io with details of the problem.</p>
          </Panel>
        ) : (this.props.ownEthBalance && new BigNumber(this.props.ownEthBalance).lt("0.005")) ? (
          <Panel header="Low Ethereum Balance" bsStyle="danger">
            <p>Your Ethereum account may not have enough ETH to pay for "gas" fees.</p>
            <p>Gas fees are needed to send Ethereum transactions, such as when placing orders or making payments.</p>
            <p>Consider topping up your {this.props.bridgeStatus.chosenAccount} account with more Ether (<i>not</i> your book contract balance).</p>
          </Panel>
        ) : undefined}
      </div>
    );
  }
}

export default BridgeStatus;
