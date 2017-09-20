import React from "react";
import { Button, Modal } from "react-bootstrap";

import CreateOrderExample from "./create-order-example.png";

class DemoHelp extends React.Component {

  render() {
    return (
      <Modal show={this.props.show} onHide={this.props.onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Welcome to the UbiTok.io Demo!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            This is a <i>simulation</i> of the UbiTok.io exchange - it's all just happening in your browser.
          </p>
          <p>
            We've built this demo page so you can try out UbiTok.io without needing to connect to the real Ethereum network or spend any money.
          </p>
          <p>
            You've got some (virtual) DEMO tokens and demo ether - see the "Balances and Payments" section. (If you run out, you can always just refresh the page).
          </p>
          <p>
            To make it more interesting, we've added some robot traders - so don't be surprised if you see some activity. Can you outsmart them?
          </p>
          <p>
            To get started, why not try placing your first order in the "Create Order" section. It will look something like this:
          </p>
          <p>
            <img src={CreateOrderExample} alt="example completed create order form" />
          </p>
          <p>
            (Not here though, that's just a screenshot).
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onHide}>OK, I got it</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default DemoHelp;
