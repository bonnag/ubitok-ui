import React, { Component } from "react";
import { Navbar, Nav, NavItem, NavDropdown, MenuItem, Tab, Tabs,
  Grid, Row, Col, Table,
  ButtonToolbar, Button, Glyphicon, 
  Tooltip, OverlayTrigger } from "react-bootstrap";

import update from "immutability-helper";
import moment from "moment";

import Cookies from "js-cookie";

import { NotificationContainer } from "react-notifications";

import Spinner from "react-spinkit";
import UbiLogo from "./ubitok-logo.svg";
import DemoLogo from "./demo-logo.svg";
import TestLogo from "./test-logo.svg";

import BridgeStatus from "./bridge-status.js";
import BridgeStatusNav from "./bridge-status-nav.js";
import BridgeSelect from "./bridge-select.js";
import ManualTxn from "./manual-txn.js";
import CreateOrder from "./create-order.js";
import EthTxnLink from "./eth-txn-link.js";
import PriceCell from "./price-cell.js";
import OrderDetails from "./order-details.js";
import DemoHelp from "./demo-help.js";
import BookInfo from "./book-info.js";
import DepositErc20 from "./deposit-erc20.js";
import DepositEth from "./deposit-eth.js";
import Withdraw from "./withdraw.js";

import "./App.css";
import "react-notifications/lib/notifications.css";

import MoneyAmount from "./money-amount.js";
import Bridge from "./polling-bridge.js";
import BookBuilder from "./book-builder.js";
import DemoBridge from "./demo-bridge.js";
import EventEmitter from "./event-emitter.js";
import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
import UbiBooks from "ubitok-jslib/ubi-books.js";

let BigNumber = UbiTokTypes.BigNumber;

class App extends Component {
  constructor(props) {
    super(props);

    const bookInfo = UbiBooks.bookInfo[props.bookId];
    if (!bookInfo) {
      window.location.replace("https://ubitok.io/products/");
      return;
    }
    this.baseDecimals = bookInfo.base.decimals;
    this.priceRangeAdjustment = bookInfo.priceRangeAdjustment;
    const networkInfo = UbiBooks.networkInfo[bookInfo.networkId];
    bookInfo.liveness = networkInfo.liveness;
    if (networkInfo.liveness === "DEMO") {
      this.bridge = new DemoBridge(bookInfo, networkInfo);
    } else {
      this.bridge = new Bridge(bookInfo, networkInfo);
    }
    this.lastBridgeStatus = this.bridge.getInitialStatus();

    this.bookBuilder = new BookBuilder(this.bridge, this.handleBookUpdate);

    this.priceClickEventEmitter = new EventEmitter();
    
    this.state = {

      // current time (helps testability vs. straight new Date())
      "clock": new Date(),

      // are we connected to Ethereum network? which network? what account?

      "bridgeStatus": this.bridge.getInitialStatus(),

      // what are we trading?
      // e.g.
      // symbol: "TEST/ETH",
      // liveness: "DEMO",
      // priceRangeAdjustment: 0,
      // base: {
      //   tradableType: "ERC20",
      //   symbol: "TEST",
      //   decimals: 18,
      //   name: "Test Token",
      //   address: "0x678c4cf3f4a26d607d0a0032d72fdc3b1e3f71f4",
      //   minInitialSize: "0.01"
      // },
      // cntr: {
      //   as base (but no address)
      // },
      // rwrd: {
      //   as base
      // }

      "pairInfo": bookInfo,

      // how much money do we have where (in display units)?
      // "" = unknown

      "balances": {
        exchangeBase: "",
        exchangeCntr: "",
        exchangeRwrd: "",
        approvedBase: "",
        approvedRwrd: "",
        ownBase: "",
        ownCntr: "",
        ownRwrd: ""
      },

      // which payment tab the user is on

      "paymentTabKey": "none",
      
      // payment forms

      "depositBase": {
        "newApprovedAmount": "0.0"
      },

      "withdrawBase": {
        "amount": "0.0"
      },

      "depositCntr": {
        "amount": "0.0"
      },

      "withdrawCntr": {
        "amount": "0.0"
      },

      // this isn't persistent, we only show payments made in this session
      // (suppose could use brower storage?)
      //
      // example:
      // [{
      //   pmtId: 1534567345673463,
      //   createdAt: new Date(..),
      //   txnHash: undefined | "0x5f757...",
      //   action: "Deposit ETH",
      //   amount: "10.00",
      //   pmtStatus: "Sending" | "FailedSend" | "Complete"
      // }]
      //

      "paymentHistory" : [
      ],
      
      // the "friendly" order book

      "book": {
        // have we finished walking the book initially?
        "isComplete": false,
        // friendly price + depth pairs, sorted for display
        "asks": [],
        "bids": []
      },

      // is the user on the Buying or Selling tab?

      "createOrderDirection": "Buy",

      // Orders the client has created.
      // (keyed by orderId, which sorting as a string corresponds to sorting by client-claimed-creation-time)
      // Example:
      //   "Rbc23fg9" : {
      //     "orderId": "Rbc23fg9",
      //     "price": "Buy @ 2.00",
      //     "sizeBase": "1000.0",
      //     "terms": "GTCNoTopup",
      //     "status": "Open",
      //     "reasonCode": "None",
      //     "rawExecutedBase": new BigNumber(0),
      //     "rawExecutedQuoted": new BigNumber(0),
      //     "rawFeeAmount": new BigNumber(0),
      //     "modifyInProgress": "Cancelling"
      //     "txnHash": undefined,
      //   }

      "myOrders": {
      },
      "myOrdersLoaded": false,

      // Whether to show the more info modal, and which order to describe in it:

      "showOrderInfo": false,
      "orderInfoOrderId": undefined,

      // Trades that have happened in the market (keyed by something unique).
      // Example:
      //
      //  "123-99": {
      //    "marketTradeId": "123-99",
      //    "blockNumber": 123, // only used for sorting, might remove
      //    "logIndex": 99, //  // only used for sorting, might remove
      //    "eventTimestamp": <a js Date>,
      //    "makerOrderId":"Rb101x",
      //    "makerPrice":"Buy @ 0.00000123",
      //    "executedBase":"50.0",
      //  }
      //
      
      "marketTrades": {
      },
      "marketTradesLoaded": false,

      // TODO - use a cookie/localStorage to stop showing it every time?
      "showDemoHelp": networkInfo.liveness === "DEMO",

      // how to connect to network - show, mode, manualEthAddress

      "bridgeSelect": this.getInitialBridgeSelect(networkInfo),
      
      // pop-up to view min order size etc.
      "showBookInfo": false,

      // used when in "manual" mode for clients who want to send via e.g. MEW

      // goalDesc="place an order to Buy @ 1.23"
      // appearDesc="your order"
      // fromAddress="0xFaceBabeCafeBabeCafeBabeCafeBabeCafeBabe"
      // toAddress="0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef"
      // amountToSend="1.2345"
      // gasLimit="600000"
      // data="0xABCDABCDABCBCDABCDABCDABCDABCDABCDABCDABCDABCDABCDABCDABCDABCDABCDABCDABCD"
      // TODO - how to route callback properly?

      "manualTxnRequest": {
        show: false,
        goalDesc: "",
        appearDesc: "",
        fromAddress: "",
        toAddress: "",
        amountToSend: "",
        gasLimit: "",
        data: ""
      }

    };
    this.bridge.subscribeStatus(this.handleStatusUpdate);
    this.bridge.subscribeBalance(this.handleBalanceUpdate);
    window.setInterval(this.updateClock, 1000);
    window.setInterval(this.purgeExcessData, 30000);
    window.document.title = "UbiTok.io - " + this.state.pairInfo.symbol;
  }

  panic = (msg) => {
    this.warn(msg);
  }

  warn = (msg) => {
    /* eslint-disable no-console */
    console.log("UbiTok App warning:", msg);
    /* eslint-enable no-console */
  }

  getInitialBridgeSelect = (networkInfo) => {
    if (networkInfo.liveness === "DEMO") {
      return { show: false, mode: "metamask", manualEthAddress: "" };
    }
    let prefsStr = Cookies.get("UbiTokBridgePrefs");
    let prefs = undefined;
    try {
      prefs = JSON.parse(prefsStr);
    } catch (e) {
      // not useful
    }
    let mode = "";
    let manualEthAddress = "";
    if (prefs && prefs.mode) {
      mode = prefs.mode;
    }
    if (prefs && prefs.manualEthAddress) {
      manualEthAddress = prefs.manualEthAddress;
    }
    return {
      show: true,
      mode: mode,
      manualEthAddress: manualEthAddress
    };
  }
  
  handleDemoHelpHide = () => {
    this.setState((prevState, props) => {
      return { showDemoHelp: false };
    });
  }

  handleBookInfoShow = () => {
    this.setState((prevState, props) => {
      return { showBookInfo: true };
    });
  }

  handleBookInfoHide = () => {
    this.setState((prevState, props) => {
      return { showBookInfo: false };
    });
  }
  
  updateClock = () => {
    this.setState((prevState, props) => {
      return {
        clock: new Date()
      };
    });
  }

  purgeExcessData = () => {
    // TODO - avoid too many closed my orders + too many market trades
  }

  getMySortedOrders = () => {
    // we generate our orderIds in chronological order, want opposite
    // how expensive is this?
    return Object.keys(this.state.myOrders).sort(
      (a,b) => {
        if (a < b) {
          return 1;
        }
        if (a > b) {
          return -1;
        }
        return 0;
      }
    ).map((orderId) => this.state.myOrders[orderId]);
  }

  // is this a bit complicated? could we just format the ids in a sort-friendly way?
  // want newest first
  cmpMarketTradeIds = (aId, bId) => {
    var a = this.state.marketTrades[aId];
    var b = this.state.marketTrades[bId];
    if (a.blockNumber < b.blockNumber) {
      return 1;
    }
    if (a.blockNumber > b.blockNumber) {
      return -1;
    }
    if (a.logIndex < b.logIndex) {
      return 1;
    }
    if (a.logIndex > b.logIndex) {
      return -1;
    }
    return 0;
  }

  formatBase = (rawAmount) => {
    return UbiTokTypes.decodeBaseAmount(rawAmount, this.baseDecimals);
  }

  formatCntr = (rawAmount) => {
    return UbiTokTypes.decodeCntrAmount(rawAmount);
  }

  formatEventDate = (eventDate) => {
    if (!eventDate) return "";
    let then = moment(eventDate);
    let now = moment(this.state.clock);
    if (then.isAfter(now)) {
      return "just now";
    }
    return moment(eventDate).from(moment(this.state.clock));
  }

  formatCreationDateOf = (orderId) => {
    let creationDate = UbiTokTypes.extractClientDateFromDecodedOrderId(orderId);
    return this.formatEventDate(creationDate);
  }
  
  handleStatusUpdate = (error, newBridgeStatus) => {
    let oldStatus = this.lastBridgeStatus;
    if (!oldStatus.canReadBook && newBridgeStatus.canReadBook) {
      this.readPublicData();
    }
    if (!oldStatus.canReadAccountOrders && newBridgeStatus.canReadAccountOrders) {
      this.readAccountData();
    }
    this.lastBridgeStatus = newBridgeStatus;
    this.setState((prevState, props) => {
      return {
        bridgeStatus: newBridgeStatus
      };
    });
  }

  readPublicData = () => {
    this.bridge.subscribeFutureMarketEvents(this.handleMarketEvent);
    this.bridge.getHistoricMarketEvents(this.handleHistoricMarketEvents);
    this.bookBuilder.start();
  }

  readAccountData = () => {
    this.bridge.walkMyOrders(undefined, this.handleWalkMyOrdersCallback);
  }

  handleBookUpdate = (error) => {
    if (error) {
      this.panic(error);
      return;
    }
    if (this.bookBuilder.isComplete) {
      let niceBook = this.bookBuilder.getNiceBook();
      this.setState((prevState, props) => {
        return {
          book: update(prevState.book, {
            isComplete: {$set: true},
            bids: {$set: niceBook[0]},
            asks: {$set: niceBook[1]},
          })
        };
      });
    }
  }

  handleClickReloadOrderBook = () => {
    this.setState((prevState, props) => {
      return {
        book: update(prevState.book, {
          isComplete: {$set: false},
          bids: {$set: []},
          asks: {$set: []},
        })
      };
    });
    this.bookBuilder.reload();
  }

  getBookPadding = (side) => {
    let padding = [];
    for (let i = this.state.book[side].length; i < 6; i++) {
      padding.push(["pad" + i, ""]);
    }
    if (this.state.book[side].length === 0) {
      if (this.state.book.isComplete) {
        padding[0][1] = "No orders found - fancy making a market?";
      } else {
        padding[0][1] = "Loading order book ...";
      }
    }
    return padding;
  }

  handleHistoricMarketEvents = (error, events) => {
    if (error) {
      this.panic(error);
      return;
    }
    for (let event of events) {
      this.addMarketTradeFromEvent(event);
    }
    this.setState((prevState, props) => {
      return {
        marketTradesLoaded: update(prevState.marketTradesLoaded, {$set: true})
      };
    });
  }

  handleMarketEvent = (error, event) => {
    if (error) {
      this.panic(error);
      return;
    }
    if (this.isInMyOrders(event.orderId)) {
      this.bridge.getOrderState(event.orderId, (error, result) => {
        this.updateMyOrder(event.orderId, result);
      });
    }
    this.addMarketTradeFromEvent(event);
  }

  addMarketTradeFromEvent = (event) => {
    if (event.marketOrderEventType === "PartialFill" || event.marketOrderEventType === "CompleteFill") {
      // could simplify by making this naturally sortable?
      this.addMarketTrade({
        marketTradeId: "" + event.blockNumber + "-" + event.logIndex,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        eventTimestamp: event.eventTimestamp,
        makerOrderId: event.orderId,
        makerPrice: UbiTokTypes.decodePrice(event.pricePacked, this.priceRangeAdjustment),
        executedBase: this.formatBase(event.rawTradeBase),
      });
    }
  }

  addMarketTrade = (marketTrade) => {
    this.setState((prevState, props) => {
      let entry = {};
      entry[marketTrade.marketTradeId] = marketTrade;
      return {
        marketTrades: update(prevState.marketTrades, { $merge: entry })
      };
    });
  }
  
  handleWalkMyOrdersCallback = (error, result) => {
    if (error) {
      return this.panic(error);
    }
    var order = UbiTokTypes.decodeWalkClientOrder(result, this.baseDecimals, this.priceRangeAdjustment);
    if (order.status === "Unknown") {
      this.handleMyOrdersLoaded();
    } else {
      this.createMyOrder(order);
      this.bridge.walkMyOrders(order.orderId, this.handleWalkMyOrdersCallback);
    }
  }

  handleMyOrdersLoaded = () => {
    this.setState((prevState, props) => {
      return {
        myOrdersLoaded: update(prevState.myOrdersLoaded, {$set: true})
      };
    });
    this.bridge.subscribeFutureClientOrderEvents(this.handleFutureClientOrderEvent);
  }

  handleFutureClientOrderEvent = (error, event) => {
    if (error) {
      return this.warn(error);
    }
    this.refreshOrder(event.orderId);
  }

  handleBalanceUpdate = (error, newExchangeBalanceSubset) => {
    if (error) {
      // not much we can do, wait for retry
      return;
    }
    this.setState((prevState, props) => {
      return {
        balances: update(prevState.balances, {$merge: newExchangeBalanceSubset})
      };
    });
  }

  handleCreateOrderDirectionSelect = (key) => {
    this.setState((prevState, props) => {
      return {
        createOrderDirection: key
      };
    });
  }

  handlePlaceOrder = (orderId, price, sizeBase, terms) => {
    let callback = (error, result) => {
      this.handlePlaceOrderCallback(orderId, error, result);
    };
    let maxMatches = this.chooseMaxMatches(price, sizeBase, terms);
    this.bridge.submitCreateOrder(orderId, price, sizeBase, terms, maxMatches, callback);
    var newOrder = this.fillInSendingOrder(orderId, price, sizeBase, terms);
    this.createMyOrder(newOrder);
  }

  chooseMaxMatches = (price, sizeBase, terms) => {
    if (terms === "MakerOnly") {
      return 0;
    }
    let estimatedMatches = this.bookBuilder.estimateMatches(price, sizeBase);
    // perhaps we should allow the user some control over this?
    let maxMatches = 2 + estimatedMatches;
    if (maxMatches < 3) {
      maxMatches = 3;
    } else if (maxMatches > 15) {
      maxMatches = 15;
    }
    return maxMatches;
  }

  isInMyOrders = (orderId) => {
    return this.state.myOrders.hasOwnProperty(orderId);
  }

  createMyOrder = (order) => {
    let sourceObject = {};
    sourceObject[order.orderId] = order;
    this.setState((prevState, props) => {
      return {
        myOrders: update(prevState.myOrders, {$merge: sourceObject})
      };
    });
  }

  updateMyOrder = (orderId, partialOrder) => {
    let query = {};
    if (!this.isInMyOrders(orderId)) {
      return;
    }
    query[orderId] = { $merge: partialOrder };
    this.setState((prevState, props) => {
      return {
        myOrders: update(prevState.myOrders, query)
      };
    });
  }
  
  // TODO - move to UbiTokTypes?
  fillInSendingOrder = (orderId, price, sizeBase, terms) => {
    return {
      orderId: orderId,
      price: price,
      sizeBase: sizeBase,
      terms: terms,
      status: "Sending",
      reasonCode: "None",
      rawExecutedBase: new BigNumber(0),
      rawExecutedCntr: new BigNumber(0),
      rawFeesBaseOrCntr: new BigNumber(0),
      rawFeesRwrd: new BigNumber(0),
      modifyInProgress: undefined,
      txnHash: undefined
    };
  }

  refreshOrder = (orderId) => {
    if (!this.isInMyOrders(orderId)) {
      this.bridge.getOrderDetails(orderId, (error, result) => {
        if (error) {
          this.warn(error);
          // TODO - retry?
          return;
        }
        if (result) {
          // ah but what if it has appeared by now?
          this.createMyOrder(result);
        }
      });
    } else {
      this.bridge.getOrderState(orderId, (error, result) => {
        if (error) {
          this.warn(error);
          // TODO - retry?
          return;
        }
        if (result) {
          this.updateMyOrder(orderId, result);
        }
      });
    }
  }

  handlePlaceOrderCallback = (orderId, error, result) => {
    if (error) {
      this.updateMyOrder(orderId, { status: "FailedSend" });
    } else {
      if (result.event === "GotTxnHash") {
        this.updateMyOrder(orderId, {txnHash: result.txnHash});
      } else if (result.event === "ManualSend") {
        // not much we can do?
      } else if (result.event === "ManualSendCleanupHint") {
        // not much we can do?
        this.refreshOrder(orderId);
      } else {
        // TODO - handle FailedTxn (will appear as Unknown otherwise)
        this.refreshOrder(orderId);
      }
    }
  }

  handleModifyOrderCallback = (orderId, error, result) => {
    // TODO - but what if someone does multiple cancels/continues ...
    //var existingOrder = this.state.myOrders[orderId];
    if (error) {
      this.updateMyOrder(orderId, { modifyInProgress: undefined });
    } else {
      if (result.event === "GotTxnHash") {
        // TODO - suppose should try to convey the txn hash for cancel/continue somehow
      } else if (result.event === "ManualSend") {
        // not much we can do?
        this.updateMyOrder(orderId, { status: "Unknown" });
      } else if (result.event === "ManualSendCleanupHint") {
        // not much we can do?
        this.updateMyOrder(orderId, { modifyInProgress: undefined });
        this.refreshOrder(orderId);
      } else {
        // TODO - handle FailedTxn differently?
        this.updateMyOrder(orderId, { modifyInProgress: undefined });
        this.refreshOrder(orderId);
      }
    }
  }
  
  handleClickMoreInfo = (orderId) => {
    this.setState((prevState, props) => {
      return {
        showOrderInfo: true,
        orderInfoOrderId: orderId
      };
    });
  }

  handleOrderInfoCloseClick = () => {
    this.setState((prevState, props) => {
      return {
        showOrderInfo: false
      };
    });
  }

  handleClickCancelOrder = (orderId) => {
    let callback = (error, result) => {
      this.handleModifyOrderCallback(orderId, error, result);
    };
    this.updateMyOrder(orderId, {modifyInProgress: "Cancelling"});
    this.bridge.submitCancelOrder(orderId, callback);
  }

  handleClickContinueOrder = (orderId) => {
    let callback = (error, result) => {
      this.handleModifyOrderCallback(orderId, error, result);
    };
    let order = this.state.myOrders[orderId];
    this.updateMyOrder(orderId, {modifyInProgress: "Continuing"});
    let maxMatches = this.chooseMaxMatches(order.price, order.sizeBase, order.terms);
    this.bridge.submitContinueOrder(orderId, maxMatches, callback);
  }

  handleClickHideOrder = (orderId) => {
    this.setState((prevState, props) => {
      return {
        myOrders: update(prevState.myOrders, {$unset: [orderId]})
      };
    });
  }

  handleBaseDepositApproveRequest = (newApprovedAmountBase) => {
    let pmtId = this.createPaymentEntry("Approve " + this.state.pairInfo.base.symbol, newApprovedAmountBase);
    this.bridge.submitDepositBaseApprove(newApprovedAmountBase,
      (error, result) => { this.handlePaymentCallback(pmtId, error, result); });
  }

  handleBaseDepositCollectRequest = () => {
    let pmtId = this.createPaymentEntry("Collect " + this.state.pairInfo.base.symbol, "N/A");
    this.bridge.submitDepositBaseCollect(
      (error, result) => { this.handlePaymentCallback(pmtId, error, result); });
  }

  handleWithdrawBaseRequest = (amount) => {
    let pmtId = this.createPaymentEntry("Withdraw " + this.state.pairInfo.base.symbol, amount);
    this.bridge.submitWithdrawBaseTransfer(amount,
      (error, result) => { this.handlePaymentCallback(pmtId, error, result); });
  }

  handleDepositCntrRequest = (amount) => {
    let pmtId = this.createPaymentEntry("Deposit " + this.state.pairInfo.cntr.symbol, amount);
    this.bridge.submitDepositCntr(amount,
      (error, result) => { this.handlePaymentCallback(pmtId, error, result); });
  }  

  handleWithdrawCntrRequest = (amount) => {
    let pmtId = this.createPaymentEntry("Withdraw " + this.state.pairInfo.cntr.symbol, amount);
    this.bridge.submitWithdrawCntr(amount,
      (error, result) => { this.handlePaymentCallback(pmtId, error, result); });
  }

  handlePaymentCallback = (pmtId, error, result) => {
    if (error) {
      this.updatePaymentEntry(pmtId, {pmtStatus: "FailedSend"});
      return;
    } else {
      if (result.event === "GotTxnHash") {
        this.updatePaymentEntry(pmtId, {txnHash: result.txnHash});
      } else if (result.event === "Mined") {
        this.updatePaymentEntry(pmtId, {pmtStatus: "Mined"});
      } else if (result.event === "FailedTxn") {
        this.updatePaymentEntry(pmtId, {pmtStatus: "FailedTxn"});
      } else if (result.event === "ManualSend") {
        // not much we can do?
      } else if (result.event === "ManualSendCleanupHint") {
        this.updatePaymentEntry(pmtId, {pmtStatus: "Unknown"});
      }
    }
  }

  handleClickHidePayment = (pmtId) => {
    this.setState((prevState, props) => {
      return {
        paymentHistory: prevState.paymentHistory.filter((entry) => {
          return entry.pmtId !== pmtId;
        })
      };
    });
  }

  createPaymentEntry = (action, amount) => {
    let pmtId = UbiTokTypes.uuidv4();
    let createdAt = new Date();
    var newEntry = {
      pmtId: pmtId,
      createdAt: createdAt,
      txnHash: undefined,
      action: action,
      amount: amount,
      pmtStatus: "Sending"
    };
    this.setState((prevState, props) => {
      return {
        paymentHistory: update(prevState.paymentHistory, { $unshift: [newEntry] })
      };
    });
    return pmtId;
  }

  updatePaymentEntry = (pmtId, partialPmtEntry) => {
    this.setState((prevState, props) => {
      return {
        paymentHistory: prevState.paymentHistory.map((entry) => {
          if (entry.pmtId !== pmtId) {
            return entry;
          } else {
            return update(entry, {$merge: partialPmtEntry});
          }
        })
      };
    });
  }

  makeSimpleToolTip = (text) => {
    return (
      <Tooltip id="tooltip">{text}</Tooltip>
    );
  }
  
  // TODO - don't like this, rework nav to just use plain old links
  handleTopNavSelect = (key) => {
    if (key === "Home") {
      window.open("https://ubitok.io/", "_blank");
    } else if (key === "ViewBooks") {
      window.open("https://ubitok.io/products/", "_blank");
    } else if (key === "Help") {
      window.open("https://ubitok.io/help/", "_blank");
    } else if (key === "DemoHelp") {
      this.setState((prevState, props) => {
        return {
          showDemoHelp: true
        };
      });
    }
  }

  handlePriceCellClick = (price) => {
    this.priceClickEventEmitter.emit(price);
  }

  handleBridgeSelectDone = (bridgeMode, manualEthAddress) => {
    this.bridge.init(bridgeMode, manualEthAddress, this.handleManualTransactionRequest);
    this.setState((prevState, props) => {
      return {
        bridgeSelect: update(prevState.bridgeSelect, {
          show: { $set: false }
        })
      };
    });
    try {
      let prefs = {
        mode: bridgeMode,
        manualEthAddress: manualEthAddress ? manualEthAddress : ""
      };
      let prefsStr = JSON.stringify(prefs);
      Cookies.set("UbiTokBridgePrefs", prefsStr);
    } catch (e) {
      this.warn(e);
    }
  }
  
  handleManualTransactionRequest = (goalDesc, appearDesc, fromAddress, toAddress, amountToSend, gasLimit, data, callback) => {
    this.manualTxnRequestCallback = callback;
    this.setState((prevState, props) => {
      return {
        manualTxnRequest: {
          show: true,
          goalDesc: goalDesc,
          appearDesc: appearDesc,
          fromAddress: fromAddress,
          toAddress: toAddress,
          amountToSend: UbiTokTypes.decodeCntrAmount(amountToSend),
          gasLimit: gasLimit,
          data: data
        }
      };
    });
  }

  handleManualTxnRequestDone = (sent) => {
    this.setState((prevState, props) => {
      return {
        manualTxnRequest: {
          show: false,
          goalDesc: "",
          appearDesc: "",
          fromAddress: "",
          toAddress: "",
          amountToSend: "",
          gasLimit: "",
          data: ""
        }
      };
    });
    let callback = this.manualTxnRequestCallback;
    this.manualTxnRequestCallback = undefined;
    if (!sent) {
      callback(new Error("txn rejected by user"), undefined);
    } else {
      // bit nasty
      callback(undefined, {event: "ManualSend"});
      window.setTimeout(() => {callback(undefined, {event:"ManualSendCleanupHint"});}, 20000);
    }
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          { (this.state.pairInfo.liveness === "DEMO") ? (
            <img src={DemoLogo} className="App-logo" alt="DEMO" />
          ) : undefined }
          { (this.state.pairInfo.liveness === "TEST") ? (
            <img src={TestLogo} className="App-logo" alt="TEST" />
          ) : undefined }
          <img src={UbiLogo} className="App-logo" alt="UbiTok.io" />- the unstoppable Ethereum token exchange
        </div>
        <Grid>
          <Row>
            <Navbar inverse>
              <Nav bsStyle="pills" onSelect={this.handleTopNavSelect}>
                <NavDropdown eventKey="Book" title={"Product: " + this.state.pairInfo.symbol} id="nav-dropdown">
                  <MenuItem eventKey="ViewBooks">View All Products ...</MenuItem>
                </NavDropdown>
              </Nav>
              <Navbar.Text style={{marginLeft: "-10px"}}>
                <Button bsSize="xsmall" bsStyle="info" onClick={this.handleBookInfoShow}>
                  <Glyphicon glyph="info-sign" title="book info" />
                </Button>
              </Navbar.Text>
              <BridgeStatusNav bridgeStatus={this.state.bridgeStatus} />
              <Nav bsStyle="pills" pullRight activeKey="Exchange" onSelect={this.handleTopNavSelect}>
                <NavItem eventKey="Home" href="#">Home</NavItem>
                <NavItem eventKey="Exchange" href="#">Exchange</NavItem>
                { (this.state.pairInfo.liveness === "DEMO") ? (
                  <NavItem eventKey="DemoHelp" href="#">Help</NavItem>
                ) : (
                  <NavItem eventKey="Help" href="#">Help</NavItem>
                ) }
              </Nav>
            </Navbar>
          </Row>
          <Row>
            <Col md={12}>
              <BridgeStatus bridgeStatus={this.state.bridgeStatus} ownEthBalance={this.state.balances.ownCntr} pairWarning={this.state.pairInfo.warning} />
              {/* hidden dialogs and magical things */}
              <NotificationContainer/>
              <DemoHelp show={this.state.showDemoHelp} onHide={this.handleDemoHelpHide}/>
              <BridgeSelect
                show={this.state.bridgeSelect.show}
                mode={this.state.bridgeSelect.mode}
                manualEthAddress={this.state.bridgeSelect.manualEthAddress}
                onDone={this.handleBridgeSelectDone} />
              <BookInfo pairInfo={this.state.pairInfo} show={this.state.showBookInfo} onHide={this.handleBookInfoHide}/>
              <ManualTxn show={this.state.manualTxnRequest.show}
                goalDesc={this.state.manualTxnRequest.goalDesc}
                appearDesc={this.state.manualTxnRequest.appearDesc}
                fromAddress={this.state.manualTxnRequest.fromAddress}
                toAddress={this.state.manualTxnRequest.toAddress}
                amountToSend={this.state.manualTxnRequest.amountToSend}
                gasLimit={this.state.manualTxnRequest.gasLimit}
                data={this.state.manualTxnRequest.data}
                onDone={(sent)=>{this.handleManualTxnRequestDone(sent);}}
                chosenNetworkId={this.state.pairInfo.networkId}
                chosenNetworkName={this.state.bridgeStatus.chosenSupportedNetworkName}
              />
            </Col>
          </Row>
          <Row>
            <Col md={4}>
              <h5>Balances and Payments</h5>
              <Table bordered condensed id="funds-table">
                <thead>
                  <tr className="small-print">
                    <th></th>
                    <th>Exchange</th>
                    <th>External</th>
                    <th>Deposit &amp; Withdraw</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{this.state.pairInfo.base.symbol}</td>
                    <OverlayTrigger placement="top" overlay={this.makeSimpleToolTip("Your " + this.state.pairInfo.base.name + " funds held in the contract. Can be sold for " + this.state.pairInfo.cntr.symbol + " or withdrawn.")}>
                      <td style={{textAlign:"right"}}>
                        <span>
                          <MoneyAmount displayAmount={this.state.balances.exchangeBase}/>
                        </span>
                      </td>
                    </OverlayTrigger>
                    <OverlayTrigger placement="top" overlay={this.makeSimpleToolTip(this.state.pairInfo.base.name + " funds held by your address. You'll need to deposit them into the contract to buy " + this.state.pairInfo.cntr.symbol + ".")}>
                      <td style={{textAlign:"right"}}>
                        <span className="small-print">
                          <MoneyAmount displayAmount={this.state.balances.ownBase}/>
                        </span>
                      </td>
                    </OverlayTrigger>
                    <td>
                      <ButtonToolbar className="pull-right">
                        <Button bsStyle="primary" bsSize="xsmall" title="Deposit into Exchange" onClick={() => this.setState({paymentTabKey: "depositBase"})}><Glyphicon glyph="plus" title="" />Dep</Button><Button bsStyle="warning" bsSize="xsmall" title="Withdraw from Exchange" onClick={() => this.setState({paymentTabKey: "withdrawBase"})}><Glyphicon glyph="minus" title="" />Wtd</Button>
                      </ButtonToolbar>
                    </td>
                  </tr>
                  <tr>
                    <td>{this.state.pairInfo.cntr.symbol}</td>
                    <OverlayTrigger placement="top" overlay={this.makeSimpleToolTip("Your " + this.state.pairInfo.cntr.name + " funds held in the contract. Can be used to buy " + this.state.pairInfo.base.symbol + " or withdrawn.")}>
                      <td style={{textAlign:"right"}}>
                        <span>
                          <MoneyAmount displayAmount={this.state.balances.exchangeCntr}/>
                        </span>
                      </td>
                    </OverlayTrigger>
                    <OverlayTrigger placement="top" overlay={this.makeSimpleToolTip(this.state.pairInfo.cntr.name + " funds held by your address. You'll need to deposit them into the contract to buy " + this.state.pairInfo.base.symbol + ".")}>
                      <td style={{textAlign:"right"}}>
                        <span className="small-print">
                          <MoneyAmount displayAmount={this.state.balances.ownCntr}/>
                        </span>
                      </td>
                    </OverlayTrigger>
                    <td>
                      <ButtonToolbar className="pull-right">
                        <Button bsStyle="primary" bsSize="xsmall" title="Deposit into Exchange" onClick={() => this.setState({paymentTabKey: "depositCntr"})}><Glyphicon glyph="plus" title="" />Dep</Button><Button bsStyle="warning" bsSize="xsmall" title="Withdraw from Exchange" onClick={() => this.setState({paymentTabKey: "withdrawCntr"})}><Glyphicon glyph="minus" title="" />Wtd</Button>
                      </ButtonToolbar>
                    </td>
                  </tr>
                  <tr>
                    <td>{this.state.pairInfo.rwrd.symbol}</td>
                    <OverlayTrigger placement="top" overlay={this.makeSimpleToolTip("Your " + this.state.pairInfo.rwrd.name + " funds held in the contract. Can be used to pay fees or withdrawn.")}>
                      <td style={{textAlign:"right"}}>
                        <span>
                          <MoneyAmount displayAmount={this.state.balances.exchangeRwrd}/>
                        </span>
                      </td>
                    </OverlayTrigger>
                    <OverlayTrigger placement="top" overlay={this.makeSimpleToolTip(this.state.pairInfo.rwrd.name + " funds held by your address. You can deposit them into the contract to pay trading fees.")}>
                      <td style={{textAlign:"right"}}>
                        <span className="small-print">
                          <MoneyAmount displayAmount={this.state.balances.ownRwrd}/>
                        </span>
                      </td>
                    </OverlayTrigger>
                    <td>
                      <ButtonToolbar className="pull-right">
                        <Button bsStyle="primary" bsSize="xsmall" title="Deposit into Exchange" onClick={() => this.setState({paymentTabKey: "depositRwrd"})}><Glyphicon glyph="plus" title="" />Dep</Button><Button bsStyle="warning" bsSize="xsmall" title="Withdraw from Exchange" onClick={() => this.setState({paymentTabKey: "withdrawRwrd"})}><Glyphicon glyph="minus" title="" />Wtd</Button>
                      </ButtonToolbar>
                    </td>
                  </tr>
                  { (this.state.paymentHistory.length > 0) ? (
                    <tr>
                      <th colSpan="4">History</th>
                    </tr>
                  ) : undefined }
                  {this.state.paymentHistory.map((entry) =>
                    <tr key={entry.pmtId}>
                      <td colSpan="3">
                        { (entry.pmtStatus === "FailedSend") ? (
                          <Glyphicon glyph="exclamation-sign" className="standaloneGlyphicon" title="failed to send payment" />
                        ) : null }
                        { (entry.pmtStatus === "FailedTxn") ? (
                          <Glyphicon glyph="exclamation-sign" className="standaloneGlyphicon" title="payment transaction failed" />
                        ) : null }
                        { (entry.pmtStatus === "Unknown") ? (
                          <Glyphicon glyph="question-sign" className="standaloneGlyphicon" title="submitted manually - check your wallet"/>
                        ) : null }
                        <EthTxnLink txnHash={entry.txnHash} networkName={this.state.bridgeStatus.chosenSupportedNetworkName} />
                        {entry.action}
                        { (entry.pmtStatus === "Sending") ? (
                          <Spinner name="line-scale" color="purple"/>
                        ) : null }
                      </td>
                      <td>
                        {entry.amount}
                        { (entry.pmtStatus !== "Sending") ? (
                          <Button bsSize="xsmall" className="pull-right" bsStyle="default" onClick={() => this.handleClickHidePayment(entry.pmtId)}>
                            <Glyphicon glyph="eye-close" title="hide payment" />
                          </Button>
                        ) : null }
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <Tab.Container activeKey={this.state.paymentTabKey} onSelect={()=>{}} id="payment-tabs">
                <Tab.Content>
                  <Tab.Pane eventKey="none" className="emptyTabPane">
                  </Tab.Pane>
                  <Tab.Pane eventKey="depositBase">
                    <p>
                      <b>Deposit {this.state.pairInfo.base.symbol}</b>
                      <Button bsSize="xsmall" className="pull-right" bsStyle="default" onClick={() => this.setState({paymentTabKey: "none"})}>
                        <Glyphicon glyph="remove" title="close" />
                      </Button>
                    </p>
                    {/* TODO - pass in bridge status so can prevent if account unavailable */}
                    <DepositErc20
                      symbol={this.state.pairInfo.base.symbol}
                      decimals={this.state.pairInfo.base.decimals}
                      chosenAccount={this.state.bridgeStatus.chosenAccount}
                      ownAmount={this.state.balances.ownBase}
                      approvedAmount={this.state.balances.approvedBase}
                      onApprove={this.handleBaseDepositApproveRequest}
                      onCollect={this.handleBaseDepositCollectRequest}
                    />
                  </Tab.Pane>
                  <Tab.Pane eventKey="withdrawBase">
                    <p>
                      <b>Withdraw {this.state.pairInfo.base.symbol}</b>
                      <Button bsSize="xsmall" className="pull-right" bsStyle="default" onClick={() => this.setState({paymentTabKey: "none"})}>
                        <Glyphicon glyph="remove" title="close" />
                      </Button>
                    </p>
                    <Withdraw 
                      symbol={this.state.pairInfo.base.symbol}
                      decimals={this.state.pairInfo.base.decimals}
                      chosenAccount={this.state.bridgeStatus.chosenAccount}
                      onWithdraw={this.handleWithdrawBaseRequest}
                    />
                  </Tab.Pane>
                  <Tab.Pane eventKey="depositCntr">
                    <p>
                      <b>Deposit {this.state.pairInfo.cntr.symbol}</b>
                      <Button bsSize="xsmall" className="pull-right" bsStyle="default" onClick={() => this.setState({paymentTabKey: "none"})}>
                        <Glyphicon glyph="remove" title="close" />
                      </Button>
                    </p>
                    <DepositEth 
                      symbol={this.state.pairInfo.cntr.symbol}
                      ownAmount={this.state.balances.ownCntr}
                      chosenAccount={this.state.bridgeStatus.chosenAccount}
                      onDeposit={this.handleDepositCntrRequest}
                    />
                  </Tab.Pane>
                  <Tab.Pane eventKey="withdrawCntr">
                    <p>
                      <b>Withdraw {this.state.pairInfo.cntr.symbol}</b>
                      <Button bsSize="xsmall" className="pull-right" bsStyle="default" onClick={() => this.setState({paymentTabKey: "none"})}>
                        <Glyphicon glyph="remove" title="close" />
                      </Button>
                    </p>
                    <Withdraw 
                      symbol={this.state.pairInfo.cntr.symbol}
                      decimals={this.state.pairInfo.cntr.decimals}
                      chosenAccount={this.state.bridgeStatus.chosenAccount}
                      onWithdraw={this.handleWithdrawCntrRequest}
                    />
                  </Tab.Pane>
                  <Tab.Pane eventKey="depositRwrd">
                    <p>
                      <b>Deposit {this.state.pairInfo.rwrd.symbol}</b>
                      <Button bsSize="xsmall" className="pull-right" bsStyle="default" onClick={() => this.setState({paymentTabKey: "none"})}>
                        <Glyphicon glyph="remove" title="close" />
                      </Button>
                    </p>
                    <p>
                        Depositing/Withdrawing UBI Reward Tokens is not yet supported.
                    </p>
                  </Tab.Pane>
                  <Tab.Pane eventKey="withdrawRwrd">
                    <p>
                      <b>Withdraw {this.state.pairInfo.rwrd.symbol}</b>
                      <Button bsSize="xsmall" className="pull-right" bsStyle="default" onClick={() => this.setState({paymentTabKey: "none"})}>
                        <Glyphicon glyph="remove" title="close" />
                      </Button>
                    </p>
                    <p>
                        Depositing/Withdrawing UBI Reward Tokens is not yet supported.
                    </p>
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>

              <h5>Create Order</h5>
              {/* need tabs inline here - https://github.com/react-bootstrap/react-bootstrap/issues/1936 */}
              <Tabs activeKey={this.state.createOrderDirection} onSelect={this.handleCreateOrderDirectionSelect} id="create-order-direction">
                <Tab eventKey="Buy" title={"BUY " + this.state.pairInfo.base.symbol}>
                  <CreateOrder priceClickEventEmitter={this.priceClickEventEmitter} direction="Buy" pairInfo={this.state.pairInfo} balances={this.state.balances} bridgeStatus={this.state.bridgeStatus} onPlace={this.handlePlaceOrder} />
                </Tab>
                <Tab eventKey="Sell" title={"SELL " + this.state.pairInfo.base.symbol}>
                  <CreateOrder priceClickEventEmitter={this.priceClickEventEmitter} direction="Sell" pairInfo={this.state.pairInfo} balances={this.state.balances} bridgeStatus={this.state.bridgeStatus} onPlace={this.handlePlaceOrder} />
                </Tab>
              </Tabs>
              
            </Col>
            <Col md={8}>
              <Row>
                <Col md={12}>
                  <h5>
                    Order Book
                    {this.state.book.isComplete ? (
                      <Button bsSize="xsmall" bsStyle="info" onClick={() => this.handleClickReloadOrderBook()} style={{marginLeft: "3px"}}>
                        <Glyphicon glyph="refresh" title="reload order book" />
                      </Button>
                    ) : (
                      <Spinner name="line-scale" color="purple"/>
                    )}
                  </h5>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="capped-table-small">
                    <Table striped bordered condensed hover>
                      <thead>
                        <tr>
                          <th>Ask Price</th>
                          <th>Depth ({this.state.pairInfo.base.symbol})</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {this.state.book.asks.map((entry) =>
                          <tr key={entry[0]}>
                            <PriceCell price={entry[0]} onClick={this.handlePriceCellClick}/>
                            <td><MoneyAmount displayAmount={entry[1]}/></td>
                            <td>{entry[2]}</td>
                          </tr>
                        )}
                        {this.getBookPadding("asks").map((entry) => 
                          <tr key={entry[0]}>
                            <td colSpan="3">{entry[1]}&nbsp;</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="capped-table-small">
                    <Table striped bordered condensed hover>
                      <thead>
                        <tr>
                          <th>Bid Price</th>
                          <th>Depth ({this.state.pairInfo.base.symbol})</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {this.state.book.bids.map((entry) =>
                          <tr key={entry[0]}>
                            <PriceCell price={entry[0]} onClick={this.handlePriceCellClick}/>
                            <td><MoneyAmount displayAmount={entry[1]}/></td>
                            <td>{entry[2]}</td>
                          </tr>
                        )}
                        {this.getBookPadding("bids").map((entry) => 
                          <tr key={entry[0]}>
                            <td colSpan="3">{entry[1]}&nbsp;</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <h5>
                      My Orders
                    {this.state.myOrdersLoaded || !this.state.bridgeStatus.mightReadAccountOrders ? undefined : (
                      <Spinner name="line-scale" color="purple"/>
                    )}
                  </h5>
                  <div className="capped-table">
                    <Table striped bordered condensed hover>
                      <thead>
                        <tr>
                          <th>Created</th>
                          <th>Price</th>
                          <th>Size ({this.state.pairInfo.base.symbol})</th>
                          <th>Status</th>
                          <th>Filled ({this.state.pairInfo.base.symbol})</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {this.getMySortedOrders().map((entry) =>
                          <tr key={entry.orderId}>
                            <td>{this.formatCreationDateOf(entry.orderId)}</td>
                            <PriceCell price={entry.price} onClick={this.handlePriceCellClick}/>
                            <td>{entry.sizeBase}</td>
                            <td>
                              {entry.status + ((entry.modifyInProgress !== undefined) ? " (" + entry.modifyInProgress + ")" : "")}
                              { (entry.status === "Sending" || entry.modifyInProgress !== undefined) ? (
                                <Spinner name="line-scale" color="purple"/>
                              ) : undefined }
                            </td>
                            <td><MoneyAmount displayAmount={this.formatBase(entry.rawExecutedBase)}/></td>
                            <td>
                              <ButtonToolbar>
                                <Button bsSize="xsmall" bsStyle="info" onClick={() => this.handleClickMoreInfo(entry.orderId)}>
                                  <Glyphicon glyph="info-sign" title="more info" />
                                </Button>
                                { (entry.status === "Open" || entry.status === "NeedsGas") ? (
                                  <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleClickCancelOrder(entry.orderId)}>
                                    <Glyphicon glyph="remove" title="cancel order" />
                                  </Button>
                                ) : undefined }
                                { (entry.status === "NeedsGas") ? (
                                  <Button bsSize="xsmall" bsStyle="primary" onClick={() => this.handleClickContinueOrder(entry.orderId)}>
                                    <Glyphicon glyph="forward" title="continue placing order" />
                                  </Button>
                                ) : undefined }
                                { (entry.status !== "Open" && entry.status !== "NeedsGas" && entry.status !== "Sending") ? (
                                  <Button bsSize="xsmall" bsStyle="default" onClick={() => this.handleClickHideOrder(entry.orderId)}>
                                    <Glyphicon glyph="eye-close" title="hide order" />
                                  </Button>
                                ) : undefined }
                              </ButtonToolbar>
                            </td>
                          </tr>
                        )}
                        { !this.state.bridgeStatus.mightReadAccountOrders ? (
                          <tr key="dummy">
                            <td colSpan="6">Not available in guest mode.</td>
                          </tr>
                        ) : this.state.myOrdersLoaded && Object.keys(this.state.myOrders).length === 0 ? (
                          <tr key="dummy">
                            <td colSpan="6">No open or recent orders found for your address.</td>
                          </tr>
                        ) : undefined}
                      </tbody>
                    </Table>
                  </div>
                  <OrderDetails
                    show={this.state.showOrderInfo}
                    onClose={this.handleOrderInfoCloseClick}
                    myOrder={this.state.myOrders[this.state.orderInfoOrderId]} 
                    pairInfo={this.state.pairInfo}
                    chosenSupportedNetworkName={this.state.bridgeStatus.chosenSupportedNetworkName}
                    clock={this.state.clock} />
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <h5>
                      Market Trades
                    {this.state.marketTradesLoaded ? undefined : (
                      <Spinner name="line-scale" color="purple"/>
                    )}
                  </h5>
                  <div className="capped-table">
                    <Table striped bordered condensed hover>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Price</th>
                          <th>Size ({this.state.pairInfo.base.symbol})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(this.state.marketTrades)
                          .sort(this.cmpMarketTradeIds)
                          .map((marketTradeId) => this.state.marketTrades[marketTradeId])
                          .map((entry) =>
                            <tr key={entry.marketTradeId}>
                              <td>{this.formatEventDate(entry.eventTimestamp)}</td>
                              <PriceCell price={entry.makerPrice} onClick={this.handlePriceCellClick} />
                              <td><MoneyAmount displayAmount={entry.executedBase}/></td>
                            </tr>
                          )}
                        {this.state.marketTradesLoaded && Object.keys(this.state.marketTrades).length === 0 ? (
                          <tr key="dummy">
                            <td colSpan="3">No recent market trades found.</td>
                          </tr>
                        ) : undefined}
                      </tbody>
                    </Table>
                  </div>
                </Col>
              </Row>

            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}

export default App;
