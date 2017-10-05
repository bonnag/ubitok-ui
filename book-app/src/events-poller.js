// helper for polling for contract events
// needed due to unreliability of filter.watch()
class EventsPoller {
  
  constructor() {
    this._callbacks = [];
    this._lastToBlockNumber = undefined;
    this._gotOutstandingRequest = false;
    this._lastRequestSentDate = undefined;
  }

  // intended to be called when new block(s) have been spotted
  poll = (contractEventFn, initialBlockNumber, newBlockNumber) => {
    if (this._callbacks.length === 0) {
      return;
    }
    let lastTo = this._lastToBlockNumber ? this._lastToBlockNumber : initialBlockNumber;
    if (newBlockNumber <= lastTo) {
      return;
    }
    if (this._gotOutstandingRequest) {
      let now = new Date();
      let elapsedMs = now - this._lastRequestSentDate;
      if (elapsedMs < 60 * 1000) {
        // let's not hammer the web3 provider, try again next block
        // TODO - we could setup a timeout I guess rather than waiting for next poll?
        return;
      } else {
        // assume the outstanding request has failed
        // (if it ever does appear, it will be ignored)
        this._gotOutstandingRequest = false;
      }
    }
    var filter = contractEventFn({}, {
      fromBlock: lastTo + 1,
      toBlock: newBlockNumber
    });
    this._gotOutstandingRequest = true;
    this._lastRequestSentDate = new Date();
    let expectedLastRequestSentDate = this._lastRequestSentDate;
    filter.get((error, results) => {
      if (this._lastRequestSentDate.getTime() !== expectedLastRequestSentDate.getTime()) {
        // ignore this response, we must have given up on this request
        return;
      }
      this._gotOutstandingRequest = false;
      if (error) {
        // hopefully will go away on next poll
        return;
      }
      this._lastToBlockNumber = newBlockNumber;
      for (var result of results) {
        for (var cb of this._callbacks) {
          cb(error, result);
        }
      }
    });
  }

  subscribe = (callback) => {
    this._callbacks.push(callback);
  }

}

export default EventsPoller;
