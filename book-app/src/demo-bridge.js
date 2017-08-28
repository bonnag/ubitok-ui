import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
import ReferenceExchange from "ubitok-jslib/reference-exchange.js";

import DemoActorWhale from "./demo-actor-whale.js"
import DemoActorSniper from "./demo-actor-sniper.js"
import DemoActorStacker from "./demo-actor-stacker.js"

let BigNumber = UbiTokTypes.BigNumber;

class DemoBridge {

  // bookInfo and targetNetworkInfo are as in UbiBooks ...
  constructor(bookInfo, targetNetworkInfo) {

    if (targetNetworkInfo.networkId !== "demo") {
      throw new Error("demo bridge only works on demo network");
    }
    
    this.bookInfo = bookInfo;
    this.targetNetworkInfo = targetNetworkInfo;

    this.statusSubscribers = [];
    this.futureMarketEventSubscribers = [];

    this.chosenAccount = "0xDemoAccount1";
    this.blockNumber = 1000000;
    this.txnCounter = 0;

    this.rx = new ReferenceExchange();
    this.sendingQueue = [];
    this.miningQueue = [];
    
    var realNow = (new Date()).getTime();
    var now = realNow - 30 * 60 * 1000;
    
    this._actors = [];
    this._addActor(new DemoActorWhale(this, "0xDemoActorBuyWhale", "Buy", now));
    this._addActor(new DemoActorWhale(this, "0xDemoActorSellWhale", "Sell", now));
    this._addActor(new DemoActorSniper(this, "0xDemoActorBuySniper", "Buy", now));
    this._addActor(new DemoActorSniper(this, "0xDemoActorSellSniper", "Sell", now));
    this._addActor(new DemoActorStacker(this, "0xDemoActorBuyStacker", "Buy", now));
    this._addActor(new DemoActorStacker(this, "0xDemoActorSellStacker", "Sell", now));
    this.rx.collectEvents();
    
    this._rawHistoricMarketEvents = [];
    while (now < realNow) {
      this._advanceActorsAt(now);
      this._processSendingQueue();
      this._processMiningQueue(new Date(now));
      now += 10 * 1000;
    }
    this.historicMarketEvents = this._rawHistoricMarketEvents.map(me => {
      return this._translateMarketOrderEvent(me);
    });
    this._rawHistoricMarketEvents = undefined;
    
    // give user some play money
    this.rx.setBalancesForTesting(this.chosenAccount,
      UbiTokTypes.encodeBaseAmount("1000"),
      UbiTokTypes.encodeCntrAmount("200"),
      UbiTokTypes.encodeCntrAmount("0"),
      UbiTokTypes.encodeBaseAmount("3000"),
      UbiTokTypes.encodeCntrAmount("600"),
      UbiTokTypes.encodeCntrAmount("0")
    );

    window.setInterval(this._processSendingQueue, 3000);
    window.setInterval(this._processMiningQueue, 5000);
    window.setTimeout(this._pollStatus, 1000);
    window.setInterval(this._advanceActors, 2000);
  }

  _processSendingQueue = () => {
    let errors = [];
    for (let txn of this.sendingQueue) {
      this.txnCounter++;
      try {
        this.miningQueue.push(txn);
        txn.callback(undefined, {event: "GotTxnHash", txnHash: "0xDemoTxn" + this.txnCounter});
      } catch (e) {
        errors.push(e);
      }
    }
    this.sendingQueue = [];
    for (let delayedError of errors) {
      throw delayedError;
    }
  }
  
  _processMiningQueue = (maybeBlockDate) => {
    this.blockNumber++;
    this.blockDate = maybeBlockDate ? maybeBlockDate : new Date();
    let errors = [];
    for (let txn of this.miningQueue) {
      try {
        txn.invokeFn();
      } catch (e) {
        // TODO - txn failures
        errors.push(e);
      }
      try {
        txn.callback(undefined, {event:"Mined"});
      } catch (e) {
        // TODO - should be TxnFailed now?
        errors.push(e);
      }
    }
    this.miningQueue = [];
    for (let delayedError of errors) {
      throw delayedError;
    }
    let events = this.rx.collectEvents();
    let logIndex = 0;
    for (let event of events) {
      event.blockNumber = this.blockNumber;
      event.logIndex = logIndex++;
      event.blockDate = this.blockDate;
      if (event.eventType === "MarketOrderEvent") {
        this._deliverMarketOrderEvent(event);
      }
    }
  }

  _addActor = (actor) => {
    this._actors.push(actor);
    this.rx.depositBaseForTesting(actor.actorAccount, UbiTokTypes.encodeBaseAmount("100000000"));
    this.rx.depositCntrForTesting(actor.actorAccount, UbiTokTypes.encodeCntrAmount("10000000"));
  }

  // to make the demo more interesting, have some actors buying and selling ...
  _advanceActors = () => {
    var now = (new Date()).getTime();
    this._advanceActorsAt(now);
  }

  _advanceActorsAt = (now) => {
    // pretend there is a true price and true spread which vary over time
    var truePrice = 0.4 + 0.1 * this._computePeriodicValue(now, 113, 1279);
    var trueSpread = 0.02 + 0.01 * this._computePeriodicValue(now, 209, 653);
    for (let actor of this._actors) {
      actor.advance(now, truePrice, trueSpread);
    }
  }

  _computePeriodicValue = (now, shortPeriodSeconds, longPeriodSeconds) => {
    var shortFactor = Math.sin(now / 1000 / shortPeriodSeconds * 2 * Math.PI);
    var longFactor = Math.sin(now / 1000 / longPeriodSeconds * 2 * Math.PI);
    return 0.1 * shortFactor + 0.9 * longFactor;
  }

  _queueTxn = (invokeFn, txnObj, callback) => {
    // TODO - txns, callbacks, etc
    this.sendingQueue.push({
      invokeFn: invokeFn,
      txnObj: txnObj,
      callback: callback
    });
  }

  _scheduleRead = (invokeFn) => {
    window.setTimeout(invokeFn, 500);
  }

  // Used to initialise our page before polling starts.
  // TODO - document status format.
  getInitialStatus = () => {
    return {
      web3Present: false,
      chosenSupportedNetworkName: undefined,
      targetNetworkName: this.targetNetworkInfo.name,
      unsupportedNetwork: false,
      networkChanged: false,
      chosenAccount: undefined,
      accountLocked: false,
      accountChanged: false,
      canMakePublicCalls: false,
      canMakeAccountCalls: false,
      withinGracePeriod: true,
      blockInfo: ""
    };
  }

  _pollStatus = () => {
    let status = this.getUpdatedStatus();
    for (let subscriber of this.statusSubscribers) {
      subscriber(undefined, status);
    }
    window.setTimeout(this._pollStatus, 1000);
  }

  getUpdatedStatus = () => {
    let blockAge = 0;
    if (this.blockDate) {
      let millis = (new Date()).getTime() - this.blockDate.getTime();
      blockAge = Math.floor(millis / 1000);
    }
    return {
      web3Present: true,
      unsupportedNetwork: false,
      chosenSupportedNetworkName: this.targetNetworkInfo.name,
      targetNetworkName: this.targetNetworkInfo.name,
      networkChanged: false,
      chosenAccount: this.chosenAccount,
      accountLocked: false,
      accountChanged: false,
      canMakePublicCalls: true,
      canMakeAccountCalls: true,
      withinGracePeriod: false,
      blockInfo: this.blockNumber + " (" + blockAge + "s ago)"
    };
  }

  // Request periodic callbacks with latest bridge status.
  // Callback fn should take (error, result) where result is as getInitialStatus().
  // Returns nothing useful.
  subscribeStatus = (callback) => {
    this.statusSubscribers.push(callback);
  }

  // Check if the bridge currently appears able to make public (constant, no account needed) calls.
  // Returns boolean immediately; if callbackIfNot given it will be invoked with an error.
  checkCanMakePublicCalls = (callbackIfNot) => {
    return true;
  }

  // Check if the bridge currently appears able to make account-related calls.
  // Returns boolean immediately; if callbackIfNot given it will be invoked with an error.
  checkCanMakeAccountCalls = (callbackIfNot) => {
    return true;
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
  // The callback may be invoked more than once with different subsets.
  // Returns nothing useful.
  getBalances = (callback) => {
    this._scheduleRead(() => {
      const rawBalances = this.rx.getClientBalances(this.chosenAccount);
      const fmtBalances = UbiTokTypes.decodeClientBalances(rawBalances);
      // the off-book eth balance is an oddity
      fmtBalances.ownCntr = UbiTokTypes.decodeCntrAmount(this.rx.getOwnCntrBalance(this.chosenAccount));
      callback(undefined, fmtBalances);
    });
  }

  // Submit a base deposit approval for given friendly base amount.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitDepositBaseApprove = (fmtAmount, callback) => {
    let gasAmount = 250000;
    this._queueTxn(() => {
      // TODO
    }, {gas: gasAmount}, callback);
  }

  // Submit a base deposit collection.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitDepositBaseCollect = (callback) => {
    // TODO
  }

  // Submit a base withdrawal.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitWithdrawBaseTransfer = (fmtAmount, callback) => {
    // TODO
  }

  // Submit a counter deposit for given friendly amount.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitDepositCntr = (fmtAmount, callback) => {
    // TODO
  }

  // Submit a counter withdrawal for given friendly amount.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitWithdrawCntr = (fmtAmount, callback) => {
    // TODO
  }
  
  // Used to build a snapshot of the order book.
  // Thin wrapper over the contract walkBook - it's quite hard to explain (TODO)
  // Returns nothing useful.
  walkBook = (fromPricePacked, callback) => {
    this._scheduleRead(() => {
      const rawResult = this.rx.walkBook(UbiTokTypes.decodePrice(fromPricePacked));
      callback(undefined, [
        new BigNumber(UbiTokTypes.encodePrice(rawResult[0])),
        rawResult[1],
        rawResult[2],
        new BigNumber(this.blockNumber)
      ]);
    });
  }

  // Request a callback with the client's newest order or previous order before the given order.
  // Callback fn should take (error, result) - where result is as passed INTO UbiTokTypes.decodeWalkClientOrder.
  // Call with undefined maybeLastOrderId to get newest order, or with the orderId from
  // the last callback to walk through. If no order found, orderId returned will be invalid.
  // Skips closed orders if they're too old.
  // Returns nothing useful.
  walkMyOrders = (maybeLastOrderId, callback) => {
    // TODO - should we bother implementing this? Or just pretend we have none?
    this._scheduleRead(() => {
      callback(undefined, [
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0)
      ]);
    });
  }
  
  // Submit a request to create an order.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitCreateOrder = (fmtOrderId, fmtPrice, fmtSizeBase, fmtTerms, maxMatches, callback) => {
    let gasAmount = 300000 + 100000 * maxMatches;
    this._queueTxn(() => {
      this.rx.createOrder(
        this.chosenAccount,
        fmtOrderId,
        fmtPrice,
        UbiTokTypes.encodeBaseAmount(fmtSizeBase),
        fmtTerms,
        maxMatches
      );
    }, {gas: gasAmount}, callback);
  }

  // Submit a request to continue an order.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitContinueOrder = (fmtOrderId, maxMatches, callback) => {
    let gasAmount = 150000 + 100000 * maxMatches;
    this._queueTxn(() => {
      this.rx.continueOrder(
        this.chosenAccount,
        fmtOrderId,
        maxMatches
      );
    }, {gas: gasAmount}, callback);
  }

  // Submit a request to cancel an order.
  // Callback fn should take (error, event) - see TransactionWatcher.
  // Returns nothing useful.
  submitCancelOrder = (fmtOrderId, callback) => {
    this._queueTxn(() => {
      this.rx.cancelOrder(
        this.chosenAccount,
        fmtOrderId
      );
    }, {}, callback);
  }

  // Request a callback with the state of the given order.
  // Callback fn should take (error, result) where result is as UbiTokTypes.decodeOrderState.
  // Returns nothing useful.
  getOrderState = (fmtOrderId, callback) => {
    this._scheduleRead(() => {
      const refOrder = this.rx.getOrder(fmtOrderId);
      const fmtOrder = {
        orderId: refOrder.orderId,
        status: refOrder.status,
        reasonCode: refOrder.reasonCode,
        rawExecutedBase: refOrder.executedBase,
        rawExecutedCntr: refOrder.executedCntr,
        rawFees: refOrder.fees
      };
      callback(undefined, fmtOrder);
    });
  }

  // Subscribe to receive a callback whenever a market event occurs.
  // Callback fn should take (error, result) where result is as UbiTokTypes.decodeMarketOrderEvent.
  // Returns nothing useful.
  subscribeFutureMarketEvents = (callback) => {
    this.futureMarketEventSubscribers.push(callback);
  }

  _translateMarketOrderEvent = (refEvent) => {
    return {
      blockNumber: refEvent.blockNumber,
      logIndex: refEvent.logIndex,
      eventRemoved: false,
      eventTimestamp: refEvent.blockDate,
      marketOrderEventType: refEvent.marketOrderEventType,
      orderId: refEvent.orderId,
      pricePacked: UbiTokTypes.encodePrice(refEvent.price),
      rawDepthBase: refEvent.depthBase,
      rawTradeBase: refEvent.tradeBase
    };
  }

  _deliverMarketOrderEvent = (refEvent) => {
    if (this._rawHistoricMarketEvents) {
      this._rawHistoricMarketEvents.push(refEvent);
    }
    let fmtEvent = this._translateMarketOrderEvent(refEvent);
    for (let observer of this.futureMarketEventSubscribers) {
      observer(undefined, fmtEvent);
    }
  }

  // Request a callback with market events that occurred before the bridge connected.
  // Callback fn should take (error, result) where result is an array of
  // elements as returned by UbiTokTypes.decodeMarketOrderEvent.
  // Returns nothing useful.
  getHistoricMarketEvents = (callback) => {
    this._scheduleRead(() => {
      callback(undefined, this.historicMarketEvents);
    });
  }

}

export { DemoBridge as default };