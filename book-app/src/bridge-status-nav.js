import React from "react";
import { Navbar } from "react-bootstrap";

class BridgeStatusNav extends React.Component {

  render = () => {
    return (this.props.bridgeStatus.canMakeAccountCalls) ? (
        <Navbar.Text>
          <b>Account</b>&nbsp;{this.props.bridgeStatus.chosenAccount} on {this.props.bridgeStatus.chosenSupportedNetworkName}
          &nbsp;&bull;&nbsp;
          <b>Block</b>&nbsp;{this.props.bridgeStatus.blockInfo}
        </Navbar.Text>
    ) : (
      <Navbar.Text />
    );
  }
}

export default BridgeStatusNav;
