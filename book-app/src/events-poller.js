// helper for polling for contract events
// needed due to unreliability of filter.watch()
class EventsPoller {
  
  constructor(name) {
    this._name = name;
    this._callbacks = [];
    this._lastToBlockNumber = undefined;
    this._gotOutstandingRequest = false;
    this._lastRequestSentDate = undefined;
  }

  debugLog = (msg, ...args) => {
    /* eslint-disable no-console */
    console.log("UbiTok.io Debug", "EventsPoller", this._name, msg, ...args);
    /* eslint-enable no-console */
  }
  
  // experimental - some versions of web3 + some metamasks on some networks
  // don't seem to deliver event.filter.get() events unless we do this early?
  /* eslint-disable no-unused-vars */
  warmUp = (contractEventFn, initialBlockNumber, web3) => {
    this.debugLog("warming up filter", initialBlockNumber);
    var filterOptions = {
      fromBlock: initialBlockNumber,
      toBlock: 999999999
    };
    //var filter = contractEventFn({}, filterOptions);
    var filter = web3.eth.filter(filterOptions);
    filter.watch((error, result) => {
      //this.debugLog("watch", error, result);
    });
  }
  /* eslint-enable no-unused-vars */

  // intended to be called when new block(s) have been spotted
  poll = (contractEventFn, initialBlockNumber, newBlockNumber) => {
    // yet another attempt to workaround weird bugs in metamask etc
    // perhaps it's too soon to filter.get() when we first get told of new blocks?
    setTimeout(() => {
      this._reallyPoll(contractEventFn, initialBlockNumber, newBlockNumber);
    }, 2000);
  }

  _reallyPoll = (contractEventFn, initialBlockNumber, newBlockNumber) => {
    if (this._callbacks.length === 0) {
      return;
    }
    let lastTo = this._lastToBlockNumber ? this._lastToBlockNumber : initialBlockNumber;
    this.debugLog("poll", initialBlockNumber, lastTo, newBlockNumber);
    //let safeNewBlockNumber = newBlockNumber - 1;
    let safeNewBlockNumber = newBlockNumber;
    if (safeNewBlockNumber <= lastTo) {
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
    var filterOptions = {
      fromBlock: lastTo + 1,
      toBlock: safeNewBlockNumber
    };
    var filter = contractEventFn({}, filterOptions);
    this._gotOutstandingRequest = true;
    this._lastRequestSentDate = new Date();
    let expectedLastRequestSentDate = this._lastRequestSentDate;
    this.debugLog("filter.get request", filterOptions.fromBlock, filterOptions.toBlock);
    filter.get((error, results) => {
      if (this._lastRequestSentDate.getTime() !== expectedLastRequestSentDate.getTime()) {
        // ignore this response, we must have given up on this request
        return;
      }
      this._gotOutstandingRequest = false;
      if (error) {
        // hopefully will go away on next poll
        this.debugLog("filter.get response error", error);
        return;
      }
      this._lastToBlockNumber = safeNewBlockNumber;
      this.debugLog("filter.get response", safeNewBlockNumber, results.length, this._callbacks.length);
      for (var result of results) {
        for (var cb of this._callbacks) {
          cb(error, result);
        }
      }
      this.debugLog("filter.get response done");
    });
  }

  subscribe = (callback) => {
    this._callbacks.push(callback);
  }

}

export default EventsPoller;
