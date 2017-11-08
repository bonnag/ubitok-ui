import React from "react";
import { Table, Button, Modal, Panel } from "react-bootstrap";

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
                { (this.props.pairInfo.liveness === "LIVE") ? (
                  <td>
                    <a href={"https://etherscan.io/token/" + this.props.pairInfo.base.address} target="_blank" rel="noopener noreferrer">
                      {this.props.pairInfo.base.symbol}
                    </a>
                  </td>
                ) : (
                  <td>
                    {this.props.pairInfo.base.symbol}
                  </td>
                )}
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
          { this.props.pairInfo.base.notes ? (
            <Panel bsStyle="info">{this.props.pairInfo.base.notes}</Panel>
          ) : undefined }
          { (this.props.pairInfo.liveness === "LIVE") ? (
            <Panel bsStyle="info">
              Make sure you are trading the correct token - symbols are not always unique!<br/>
              The address of this token is:
              <a className="tinyHex" href={"https://etherscan.io/token/" + this.props.pairInfo.base.address} target="_blank" rel="noopener noreferrer">
                {this.props.pairInfo.base.address}
              </a>.<br/>
              Careful though - never send tokens (or ether) to a token address - that's not how it works and you won't get them back.
            </Panel>
          ) : undefined }
          { this.props.pairInfo.newerVersion ? (
            <Panel header="Deprecated Book Contract" bsStyle="danger">
              This book contract has been replaced by&nbsp;
              <a href={"/exchange/?pairId=" + this.props.pairInfo.newerVersion} target="_blank" rel="noopener noreferrer">
                a newer one
              </a>.
              You should cancel any orders you have in this contract and withdraw funds.
            </Panel>
          ) : undefined }
          { this.props.pairInfo.olderVersions && this.props.pairInfo.olderVersions.length > 0 ? (
            <Panel header="Book Contract Version" bsStyle="info">
              You are looking at the latest book contract for this pair.
              If you still have orders or funds in the older contract version(s):
              {this.props.pairInfo.olderVersions.map((entry)=>
                <span>
                  <a href={"/exchange/?pairId=" + entry} target="_blank" rel="noopener noreferrer">
                    {entry}
                  </a>, 
                </span>
              )}
              you should cancel and withdraw them.
            </Panel>
          ) : undefined }
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default BookInfo;
