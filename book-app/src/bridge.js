import Web3 from "web3";
import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
import ZeroClientProvider from "web3-provider-engine/zero.js";
let BigNumber = UbiTokTypes.BigNumber;

class Bridge {

  // bookInfo and targetNetworkInfo are as in UbiBooks ...
  constructor(bookInfo, targetNetworkInfo) {

    this.bookInfo = bookInfo;
    this.targetNetworkInfo = targetNetworkInfo;

    this.web3 = undefined;
    this.chosenSupportedNetworkId = undefined;
    this.chosenSupportedNetworkName = undefined;
    this.chosenAccount = undefined;
    this.initialBlockNumber = undefined;
    this.blockNumber = undefined;
    this.blockDate = undefined;
    this.statusSubscribers = [];
    this.startedConnectingAt = undefined;
    this.bridgeMode = undefined;
    this.manualEthAddress = "";
    this.futureMarketEventCallbacks = [];
    this.futureClientOrderEventCallbacks = [];
  }

  // Used to initialise our page before polling starts.
  // (and before we even know what mode we're in)
  // TODO - document status format.
  getInitialStatus = () => {
    return {
      // bridgeMode is undefined, guest, metamask, or manual
      bridgeMode: undefined,
      web3Present: false,
      chosenSupportedNetworkName: undefined,
      targetNetworkName: this.targetNetworkInfo.name,
      unsupportedNetwork: false,
      networkChanged: false,
      chosenAccount: undefined,
      accountLocked: false,
      accountChanged: false,
      canReadBook: false,
      mightReadAccountOrders: true,
      canReadAccountOrders: false,
      mightSendTransactions: true,
      canSendTransactions: false,
      withinGracePeriod: true,
      blockInfo: ""
    };
  }

  // bridgeMode is guest, metamask, or manual
  // For manual only:
  //   manualEthAddress is the client's account which they will use from e.g. MyEtherWallet -
  //     we can show their orders + balances even without key.
  //   handleManualTransactionRequest will tell the user how to send a txn.
  init = (bridgeMode, manualEthAddress, handleManualTransactionRequest) => {
    this.bridgeMode = bridgeMode;
    this.manualEthAddress = manualEthAddress;
    this.handleManualTransactionRequest = handleManualTransactionRequest;
    this.startedConnectingAt = new Date();
    window.setTimeout(this.pollStatus, 1000);
  }

  pollStatus = () => {
    let status = this.getUpdatedStatus();
    for (let subscriber of this.statusSubscribers) {
      subscriber(undefined, status);
    }
    window.setTimeout(this.pollStatus, 1000);
  }

  getUpdatedStatus = () => {
    if (this.bridgeMode === "metamask") {
      return this.getUpdatedStatusMetaMask();
    } else if (this.bridgeMode === "manual") {
      return this.getUpdatedStatusManual();
    } else if (this.bridgeMode === "guest") {
      return this.getUpdatedStatusGuest();
    } else {
      return this.getInitialStatus();
    }
  }

  getUpdatedStatusGuest = () => {
    // always returns the correct end-point for the target network id ...
    let endpoint = this._getInfuraEndpoint();
    if (this.web3 === undefined && endpoint) {
      //this.web3 = new Web3(new Web3.providers.HttpProvider(endpoint));
      // see if this makes filters work
      this.web3 = new Web3(
        ZeroClientProvider({
          static: {
            eth_syncing: false,
            web3_clientVersion: "ZeroClientProvider",
          },
          pollingInterval: 4000,
          rpcUrl: endpoint,
          // account mgmt
          getAccounts: (cb) => cb(null, [])
        })
      );
    }
    let web3Present = this.web3 !== undefined && this.web3.hasOwnProperty("version");
    if (web3Present &&  this.chosenSupportedNetworkId === undefined) {
      this.chosenSupportedNetworkId = this.targetNetworkInfo.networkId;
      this.chosenSupportedNetworkName = this.targetNetworkInfo.name;
      const bookContractAbiArray = this.bookInfo.bookAbiArray;
      let BookContract = this.web3.eth.contract(bookContractAbiArray);
      this.bookContract = BookContract.at(this.bookInfo.bookAddress);
      const baseTokenAbiArray = this.bookInfo.base.abiArray;
      let BaseTokenContract = this.web3.eth.contract(baseTokenAbiArray);
      this.baseToken = BaseTokenContract.at(this.bookInfo.base.address);
      const rwrdTokenAbiArray = this.bookInfo.rwrd.abiArray;
      let RwrdTokenContract = this.web3.eth.contract(rwrdTokenAbiArray);
      this.rwrdToken = RwrdTokenContract.at(this.bookInfo.rwrd.address);
      this.web3.eth.getBlockNumber(this._handleBlockNumber);
    }
    let canMakePublicCalls = web3Present && this.initialBlockNumber;
    let blockInfo = "";
    if (this.blockNumber && this.blockDate) {
      let millis = (new Date()).getTime() - this.blockDate.getTime();
      let blockAge = Math.floor(millis / 1000);
      blockInfo = this.blockNumber + " (" + blockAge + "s ago)";
    }
    return {
      bridgeMode: this.bridgeMode,
      web3Present: web3Present,
      unsupportedNetwork: false,
      chosenSupportedNetworkName: this.chosenSupportedNetworkName,
      targetNetworkName: this.targetNetworkInfo.name,
      networkChanged: false,
      chosenAccount: undefined,
      accountLocked: true,
      accountChanged: false,
      canReadBook: canMakePublicCalls,
      mightReadAccountOrders: false,
      canReadAccountOrders: false,
      mightSendTransactions: false,
      canSendTransactions: false,
      withinGracePeriod: (new Date() - this.startedConnectingAt) < 5000,
      blockInfo: blockInfo
    };
  }
  
  // TODO - copy-pasted from getUpdatedStatusGuest ...
  getUpdatedStatusManual = () => {
    // always returns the correct end-point for the target network id ...
    let endpoint = this._getInfuraEndpoint();
    if (this.web3 === undefined && endpoint) {
      //this.web3 = new Web3(new Web3.providers.HttpProvider(endpoint));
      // see if this makes filters work
      this.web3 = new Web3(
        ZeroClientProvider({
          static: {
            eth_syncing: false,
            web3_clientVersion: "ZeroClientProvider",
          },
          pollingInterval: 4000,
          rpcUrl: endpoint,
          // account mgmt
          getAccounts: (cb) => cb(null, [])
        })
      );
    }
    let web3Present = this.web3 !== undefined && this.web3.hasOwnProperty("version");
    if (web3Present &&  this.chosenSupportedNetworkId === undefined) {
      this.chosenSupportedNetworkId = this.targetNetworkInfo.networkId;
      this.chosenSupportedNetworkName = this.targetNetworkInfo.name;
      const bookContractAbiArray = this.bookInfo.bookAbiArray;
      let BookContract = this.web3.eth.contract(bookContractAbiArray);
      this.bookContract = BookContract.at(this.bookInfo.bookAddress);
      const baseTokenAbiArray = this.bookInfo.base.abiArray;
      let BaseTokenContract = this.web3.eth.contract(baseTokenAbiArray);
      this.baseToken = BaseTokenContract.at(this.bookInfo.base.address);
      const rwrdTokenAbiArray = this.bookInfo.rwrd.abiArray;
      let RwrdTokenContract = this.web3.eth.contract(rwrdTokenAbiArray);
      this.rwrdToken = RwrdTokenContract.at(this.bookInfo.rwrd.address);
      this.web3.eth.getBlockNumber(this._handleBlockNumber);
    }
    let canMakePublicCalls = web3Present && this.initialBlockNumber;
    let blockInfo = "";
    if (this.blockNumber && this.blockDate) {
      let millis = (new Date()).getTime() - this.blockDate.getTime();
      let blockAge = Math.floor(millis / 1000);
      blockInfo = this.blockNumber + " (" + blockAge + "s ago)";
    }
    return {
      bridgeMode: this.bridgeMode,
      web3Present: web3Present,
      unsupportedNetwork: false,
      chosenSupportedNetworkName: this.chosenSupportedNetworkName,
      targetNetworkName: this.targetNetworkInfo.name,
      networkChanged: false,
      chosenAccount: this.manualEthAddress,
      accountLocked: false,
      accountChanged: false,
      canReadBook: canMakePublicCalls,
      mightReadAccountOrders: true,
      canReadAccountOrders: canMakePublicCalls,
      mightSendTransactions: true,
      // probably need some way to warn bridge users that it's not automatic?
      canSendTransactions: canMakePublicCalls,
      withinGracePeriod: (new Date() - this.startedConnectingAt) < 5000,
      blockInfo: blockInfo
    };
  }
    
  getUpdatedStatusMetaMask = () => {
    // TODO - add support for new ethereum object
    if (this.web3 === undefined && window.web3) {
      //console.log("found web3 provider");
      this.web3 = new Web3(window.web3.currentProvider);
    }
    let web3Present = this.web3 !== undefined && this.web3.hasOwnProperty("version");
    let networkId = undefined;
    try {
      networkId = web3Present ? this.web3.version.network.toString() : undefined;
    } catch (e) {
      // in some web3 versions this seems to throw when the page is being closed?
      // treat as web3 not available yet?
      //console.log("problem using web3", e);
    }
    if (networkId === undefined) {
      web3Present = false;
    }
    let unsupportedNetwork = web3Present && networkId !== this.targetNetworkInfo.networkId;
    if (web3Present && this.chosenSupportedNetworkId === undefined && !unsupportedNetwork) {
      //console.log("choosing network", networkId);
      this.chosenSupportedNetworkId = networkId;
      this.chosenSupportedNetworkName = this.targetNetworkInfo.name;
      const bookContractAbiArray = this.bookInfo.bookAbiArray;
      let BookContract = this.web3.eth.contract(bookContractAbiArray);
      this.bookContract = BookContract.at(this.bookInfo.bookAddress);
      const baseTokenAbiArray = this.bookInfo.base.abiArray;
      let BaseTokenContract = this.web3.eth.contract(baseTokenAbiArray);
      this.baseToken = BaseTokenContract.at(this.bookInfo.base.address);
      const rwrdTokenAbiArray = this.bookInfo.rwrd.abiArray;
      let RwrdTokenContract = this.web3.eth.contract(rwrdTokenAbiArray);
      this.rwrdToken = RwrdTokenContract.at(this.bookInfo.rwrd.address);
      this.web3.eth.getBlockNumber(this._handleBlockNumber);
    }
    let networkChanged = web3Present && this.chosenSupportedNetworkId !== undefined && networkId !== this.chosenSupportedNetworkId;
    // yes this is a synchronous call but this is one of the few that metamask allows ...?
    var firstAccount = web3Present ? this.web3.eth.accounts[0] : undefined;
    let accountLocked = web3Present && firstAccount === undefined; // TODO - perhaps check not all zeroes?
    if (web3Present && this.chosenAccount === undefined && !accountLocked) {
      //console.log("choosing account", firstAccount);
      this.chosenAccount = firstAccount;
    }
    let accountChanged = web3Present && this.chosenAccount !== undefined && firstAccount !== this.chosenAccount;
    let canMakePublicCalls = web3Present && !unsupportedNetwork && !networkChanged && this.initialBlockNumber;
    let blockInfo = "";
    if (this.blockNumber && this.blockDate) {
      let millis = (new Date()).getTime() - this.blockDate.getTime();
      let blockAge = Math.floor(millis / 1000);
      blockInfo = this.blockNumber + " (" + blockAge + "s ago)";
    }
    return {
      bridgeMode: this.bridgeMode,
      web3Present: web3Present,
      unsupportedNetwork: unsupportedNetwork,
      chosenSupportedNetworkName: this.chosenSupportedNetworkName,
      targetNetworkName: this.targetNetworkInfo.name,
      networkChanged: networkChanged,
      chosenAccount: this.chosenAccount,
      accountLocked: accountLocked,
      accountChanged: accountChanged,
      canReadBook: canMakePublicCalls,
      mightReadAccountOrders: true,
      canReadAccountOrders: canMakePublicCalls && !accountLocked && !accountChanged,
      mightSendTransactions: true,
      canSendTransactions: canMakePublicCalls && !accountLocked && !accountChanged,
      withinGracePeriod: (new Date() - this.startedConnectingAt) < 5000,
      blockInfo: blockInfo
    };
  }

  _getInfuraEndpoint = () => {
    // ok, it's trivial to bypass the obfuscation - but please don't, it's against the T&Cs.
    let token = decodeURI("%50%69%4E%33%47%64%63%45%39%6E%38%64%73%33%54%6F%46%4D%57%62");
    let networkId = this.targetNetworkInfo.networkId;
    if (networkId === "3") {
      return "https://ropsten.infura.io/" + token;
    } else if (networkId === "1") {
      return "https://mainnet.infura.io/" + token;
    } else {
      throw new Error("unknown networkId " + networkId);
    }
  }
  
  // Internal - we need this to help filter events.
  // We don't consider the bridge ready to make calls until we've got it.
  _handleBlockNumber = (error, result) => {
    if (!error) {
      if (!this.initialBlockNumber) {
        this.initialBlockNumber = result;
      }
      if (result !== this.blockNumber) {
        this.blockNumber = result;
        this.blockDate = new Date();
      }
    }
    window.setTimeout(() => {
      this.web3.eth.getBlockNumber(this._handleBlockNumber);
    }, 4000);
  }

  // Request periodic callbacks with latest bridge status.
  // Callback fn should take (error, result) where result is as getInitialStatus().
  // Returns nothing useful.
  subscribeStatus = (callback) => {
    this.statusSubscribers.push(callback);
  }

  // Check if the bridge currently appears able to make public (constant, no account needed) calls.
  // Returns boolean immediately; if callbackIfNot given it will be invoked with an error.
  checkCanReadBook = (callbackIfNot) => {
    let status = this.getUpdatedStatus();
    if (!status.canReadBook && callbackIfNot) {
      window.setTimeout(function () { callbackIfNot(new Error("cannot read book: " + status));}, 0);
    }
    return status.canReadBook;
  }

  // Check if the bridge currently appears able to make account-related calls.
  // Returns boolean immediately; if callbackIfNot given it will be invoked with an error.
  checkCanReadAccountOrders = (callbackIfNot) => {
    let status = this.getUpdatedStatus();
    if (!status.canReadAccountOrders && callbackIfNot) {
      window.setTimeout(function () { callbackIfNot(new Error("cannot read account orders: " + status));}, 0);
    }
    return status.canReadAccountOrders;
  }

  // Check if the bridge currently appears able to make account-related calls.
  // Returns boolean immediately; if callbackIfNot given it will be invoked with an error.
  checkCanSendTransactions = (callbackIfNot) => {
    let status = this.getUpdatedStatus();
    if (!status.canSendTransactions && callbackIfNot) {
      window.setTimeout(function () { callbackIfNot(new Error("cannot send transactions: " + status));}, 0);
    }
    return status.canSendTransactions;
  }
  
  _getOurAddress = () => {
    // TODO - hmm, what if called too soon?
    // TODO - hmm, what if status changes so that no longer account available?
    let status = this.getUpdatedStatus();
    return status.chosenAccount;
  }

  // Request callback with client's balances (if available).
  // Callback fn should take (error, result) where result is an object
  // containing zero or more of the following formatted balances:
  //   exchangeBase
  //   exchangeCntr
  //   exchangeRwrd
  //   approvedBase
  //   approvedRwrd
  //   ownBase
  //   ownCntr
  //   ownRwrd
  // The callback may be invoked more than once with different subsets -
  // it should merge the results with any balances it already has.
  // Returns nothing useful.
  getBalances = (callback) => {
    if (!this.checkCanReadAccountOrders(callback)) {
      return;
    }
    let wrapperCallback = (error, result) => {
      if (error) {
        return callback(error, undefined);
      } else {
        let translatedResult = UbiTokTypes.decodeClientBalances(result);
        return callback(error, translatedResult);
      }
    };
    let ourAddress = this._getOurAddress();
    this.bookContract.getClientBalances(ourAddress, wrapperCallback);
    // We can't use the contract to get our eth balance due to a rather odd geth bug
    let wrapperCallback2 = (error, result) => {
      if (error) {
        return callback(error, undefined);
      } else {
        let translatedResult = {
          ownCntr: UbiTokTypes.decodeCntrAmount(result)
        };
        return callback(error, translatedResult);
      }
    };
    this.web3.eth.getBalance(ourAddress, wrapperCallback2);
  }

  sendTransaction = (goalDesc, appearDesc, contractAddress, contractMethod, contractArgs, ethValue, gasAmount, callback) => {
    let txnObj = {
      from: this._getOurAddress(),
      gas: gasAmount
    };
    if (ethValue && ethValue.gt(0)) {
      txnObj.value = ethValue;
    } else {
      txnObj.value = new BigNumber(0);
    }
    if (this.bridgeMode === "manual") {
      let data = contractMethod.getData(...contractArgs, txnObj);
      this.handleManualTransactionRequest(goalDesc, appearDesc, txnObj.from, contractAddress, txnObj.value, txnObj.gas, data, callback);
    } else {
      contractMethod.sendTransaction(
        ...contractArgs,
        txnObj,
        (new TransactionWatcher(this.web3, callback, gasAmount)).handleTxn
      );
    }
  }

  // Submit a base deposit approval for given friendly base amount.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitDepositBaseApprove = (fmtAmount, callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    // use fixed amount so can detect failures by max consumption
    // TODO - different tokens may require different amounts ...
    let gasAmount = 250000;
    this.sendTransaction(
      "approve tokens for the book contract", "approved amount change",
      this.baseToken.address, this.baseToken.approve,
      [this.bookContract.address, UbiTokTypes.encodeBaseAmount(fmtAmount).valueOf()],
      new BigNumber(0),
      gasAmount,
      callback
    );
  }

  // Submit a base deposit collection.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitDepositBaseCollect = (callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    // use fixed amount so can detect failures by max consumption
    let gasAmount = 250000;
    this.sendTransaction(
      "finish depositing tokens to the book contract", "token balance change",
      this.bookContract.address, this.bookContract.transferFromBase,
      [],
      new BigNumber(0),
      gasAmount,
      callback
    );
  }

  // Submit a base withdrawal.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitWithdrawBaseTransfer = (fmtAmount, callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    // use fixed amount so can detect failures by max consumption
    let gasAmount = 250000;
    this.sendTransaction(
      "withdraw tokens from the book contract", "token balance change",
      this.bookContract.address, this.bookContract.transferBase,
      [UbiTokTypes.encodeBaseAmount(fmtAmount).valueOf()],
      new BigNumber(0),
      gasAmount,
      callback
    );
  }

  // Submit a counter deposit for given friendly amount.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitDepositCntr = (fmtAmount, callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    let gasAmount = 150000;
    this.sendTransaction(
      "deposit ETH into the book contract", "balance change",
      this.bookContract.address, this.bookContract.depositCntr,
      [],
      UbiTokTypes.encodeCntrAmount(fmtAmount), gasAmount,
      callback
    );
  }

  // Submit a counter withdrawal for given friendly amount.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitWithdrawCntr = (fmtAmount, callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    // use fixed amount so can detect failures by max consumption
    let gasAmount = 150000;
    this.sendTransaction(
      "withdraw ETH from the book contract", "balance change",
      this.bookContract.address, this.bookContract.withdrawCntr,
      [UbiTokTypes.encodeCntrAmount(fmtAmount).valueOf()],
      new BigNumber(0),
      gasAmount,
      callback
    );
  }
  
  // Used to build a snapshot of the order book.
  // Thin wrapper over the contract walkBook - it's quite hard to explain (TODO)
  // Returns nothing useful.
  walkBook = (fromPricePacked, callback) => {
    if (!this.checkCanReadBook(callback)) {
      return;
    }
    this.bookContract.walkBook.call(fromPricePacked, callback);
  }

  // Request a callback with the client's newest order or previous order before the given order.
  // Callback fn should take (error, result) - TODO what format for result?
  // Call with undefined maybeLastOrderId to get newest order, or with the orderId from
  // the last callback to walk through. If no order found, orderId returned will be invalid.
  // Skips closed orders if they're too old.
  // Returns nothing useful.
  walkMyOrders = (maybeLastOrderId, callback) => {
    if (!this.checkCanReadAccountOrders(callback)) {
      return;
    }
    let now = new Date();
    let recentCutoffDate = new Date(now.getTime() - 24 * 3600 * 1000);
    let recentCutoffEncodedOrderId = UbiTokTypes.computeEncodedOrderId(recentCutoffDate, "0");
    var encodedLastOrderId;
    if (!maybeLastOrderId) {
      encodedLastOrderId = UbiTokTypes.deliberatelyInvalidEncodedOrderId();
    } else {
      encodedLastOrderId = UbiTokTypes.encodeOrderId(maybeLastOrderId);
    }
    // TODO - shouldn't we be responsible for decoding?
    this.bookContract.walkClientOrders.call(this._getOurAddress(), encodedLastOrderId.valueOf(), recentCutoffEncodedOrderId.valueOf(),
      callback
    );
  }
  
  // Submit a request to create an order.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitCreateOrder = (fmtOrderId, fmtPrice, fmtSizeBase, fmtTerms, maxMatches, callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    // probably too pessimistic, can reduce once analysed worst-case properly
    let gasAmount = 300000 + 100000 * maxMatches;
    this.sendTransaction(
      "place an order to " + fmtPrice, "new order",
      this.bookContract.address, this.bookContract.createOrder,
      [
        UbiTokTypes.encodeOrderId(fmtOrderId).valueOf(),
        UbiTokTypes.encodePrice(fmtPrice).valueOf(),
        UbiTokTypes.encodeBaseAmount(fmtSizeBase).valueOf(),
        UbiTokTypes.encodeTerms(fmtTerms).valueOf(),
        maxMatches,
      ],
      new BigNumber(0),
      gasAmount,
      callback
    );
  }

  // Submit a request to continue an order.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitContinueOrder = (fmtOrderId, maxMatches, callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    // probably too pessimistic, can reduce once analysed worst-case properly
    let gasAmount = 150000 + 100000 * maxMatches;
    this.sendTransaction(
      "continue matching your order", "order status change",
      this.bookContract.address, this.bookContract.continueOrder,
      [
        UbiTokTypes.encodeOrderId(fmtOrderId).valueOf(),
        maxMatches,
      ],
      new BigNumber(0),
      gasAmount,
      callback
    );
  }

  // Submit a request to cancel an order.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitCancelOrder = (fmtOrderId, callback) => {
    if (!this.checkCanSendTransactions(callback)) {
      return;
    }
    // specify fixed amount since:
    // a) can't rely on estimate 'cos it can change based on other orders being placed
    // b) it is useful for detecting failed transactions (those that used all the gas)
    let gasAmount = 150000;
    this.sendTransaction(
      "cancel your order", "order status change",
      this.bookContract.address, this.bookContract.cancelOrder,
      [
        UbiTokTypes.encodeOrderId(fmtOrderId).valueOf(),
      ],
      new BigNumber(0),
      gasAmount,
      callback
    );
  }

  // Request a callback with the state of the given order.
  // Callback fn should take (error, result) where result is as UbiTokTypes.decodeOrderState.
  // Returns nothing useful.
  getOrderState = (fmtOrderId, callback) => {
    if (!this.checkCanReadBook(callback)) {
      return;
    }
    let rawOrderId = UbiTokTypes.encodeOrderId(fmtOrderId).valueOf();
    this.bookContract.getOrderState.call(rawOrderId, (error, result) => {
      if (error) {
        callback(error, undefined);
      } else {
        callback(undefined, UbiTokTypes.decodeOrderState(fmtOrderId, result));
      }
    });
  }

  // Subscribe to receive a callback whenever a market event occurs.
  // Callback fn should take (error, result) where result is as UbiTokTypes.decodeMarketOrderEvent.
  // Returns nothing useful.
  subscribeFutureMarketEvents = (callback) => {
    if (!this.checkCanReadBook(callback)) {
      return;
    }
    if (this.futureMarketEventCallbacks.length > 0) {
      this.futureMarketEventCallbacks.push(callback);
      return;
    }
    this.futureMarketEventCallbacks = [callback];
    var filter = this.bookContract.MarketOrderEvent();
    filter.watch((error, result) => {
      var decodedResult = undefined;
      if (!error) {
        if (result.args.orderId.cmp(0) === 0 ||
            result.args.eventTimestamp.cmp(0) === 0 ||
            result.args.price.cmp(0) === 0) {
          // some odd problem if we use the web3-provider-engine to workaround
          // lack of filter support in Infura - something is trying to decode
          // our ClientOrderEvent events as MarketOrderEvents ?
          // https://github.com/INFURA/infura/issues/10
          //console.log('warning - received malformed MarketOrderEvent');
          return;
        }
        decodedResult = UbiTokTypes.decodeMarketOrderEvent(result);
      }
      for (var cb of this.futureMarketEventCallbacks) {
        cb(error, decodedResult);
      }
    });
  }

  // Request a callback with market events that occurred before the bridge connected.
  // Callback fn should take (error, result) where result is an array of
  // elements as returned by UbiTokTypes.decodeMarketOrderEvent.
  // Returns nothing useful.
  getHistoricMarketEvents = (callback) => {
    if (!this.checkCanReadBook(callback)) {
      return;
    }
    var approxBlocksPerHour = 180;
    var filter = this.bookContract.MarketOrderEvent({}, {
      fromBlock: this.initialBlockNumber - (12 * approxBlocksPerHour)
    });
    filter.get((error, result) => {
      if (error) {
        return callback(error, undefined);
      }
      callback(undefined, result.map(
        (rawEntry) => UbiTokTypes.decodeMarketOrderEvent(rawEntry)));
    });
  }

  subscribeFutureClientOrderEvents = (callback) => {
    if (!this.checkCanReadAccountOrders(callback)) {
      return;
    }
    if (this.futureClientOrderEventCallbacks.length > 0) {
      this.futureClientOrderEventCallbacks.push(callback);
      return;
    }
    this.futureClientOrderEventCallbacks = [callback];
    // TODO - only want ours - can probably filter more efficiently?
    var filter = this.bookContract.ClientOrderEvent();
    filter.watch((error, result) => {
      var decodedResult = undefined;
      if (!error) {
        decodedResult = UbiTokTypes.decodeClientOrderEvent(result);
        if (decodedResult.client.toLowerCase() !== this._getOurAddress().toLowerCase()) {
          return;
        }
      }
      for (var cb of this.futureClientOrderEventCallbacks) {
        cb(error, decodedResult);
      }
    });
  }

}

// After submitting a txn (e.g. create/cancel order, make payment),
// we need some way of knowing if/when it made it into the blockchain.
// Use by creating a TransactionWatcher and passing its handleTxn method
// as the callback to a web3 contractMethod.sendTransaction call.
// For immediate errors (e.g. user reject) it will invoke your callback
// with an error.
// Otherwise, in metamask mode it will in invoke your callback with:
//  1. {event: "GotTxnHash", txnHash: "the hash"}
// Followed by either:
//  2a. {event: "Mined"}
// or:
//  2b. {event: "FailedTxn"}
// But it can only return FailedTxn if you give it a "optionalGasFail"
// value - if the txn uses that much gas (or more) it assumes it has failed.
// TODO - is there really no better way to detect a bad transaction - think EIP on way?
// In manual mode the flow is:
//  1. {event: "ManualSend"}
// followed several seconds later by:
//  2. {event: "ManualSendCleanupHint"}
// because we don't know if the txn was actually sent .. see App.js.
class TransactionWatcher {

  constructor(web3, callback, optionalGasFail) {
    this.web3 = web3;
    this.callback = callback;
    this.optionalGasFail = optionalGasFail;
    this.txnHash = undefined;
  }
  
  handleTxn = (error, result) => {
    if (error) {
      this.callback(error, undefined);
      return;
    }
    this.txnHash = result;
    this.callback(undefined, {event: "GotTxnHash", txnHash: this.txnHash});
    this._pollTxn();
  }

  _pollTxn = () => {
    this.web3.eth.getTransactionReceipt(this.txnHash, this._handleTxnReceipt);
  }

  _handleTxnReceipt = (error, result) => {
    if (!result) {
      window.setTimeout(this._pollTxn, 3000);
      return;
    } else {
      if (this.optionalGasFail) {
        if (result.gasUsed >= this.optionalGasFail) {
          this.callback(undefined, {event: "FailedTxn"});
          return;
        }
      }
      this.callback(undefined, {event: "Mined"});
    }
  }

}

export { Bridge as default };