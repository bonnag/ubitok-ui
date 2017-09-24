import React from "react";
import { Table, Button, Modal } from "react-bootstrap";

class BookInfo extends React.Component {

  render() {
    return (
      <Modal show={this.props.show} onHide={this.props.onHide}>
        <Modal.Header closeButton>
          <Modal.Title>{this.props.pairInfo.symbol} Info</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered condensed hover>
            <thead>
              <tr>
                <th></th>
                <th>Base</th>
                <th>Counter</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Symbol</td>
                <td>{this.props.pairInfo.base.symbol}</td>
                <td>{this.props.pairInfo.cntr.symbol}</td>
              </tr>
              <tr>
                <td>Name</td>
                <td>{this.props.pairInfo.base.name}</td>
                <td>{this.props.pairInfo.cntr.name}</td>
              </tr>
              <tr>
                <td>Type</td>
                <td>{this.props.pairInfo.base.tradableType}</td>
                <td>{this.props.pairInfo.cntr.tradableType}</td>
              </tr>
              <tr>
                <td>Minimum Order</td>
                <td>{this.props.pairInfo.base.minInitialSize}</td>
                <td>{this.props.pairInfo.cntr.minInitialSize}</td>
              </tr>
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default BookInfo;
