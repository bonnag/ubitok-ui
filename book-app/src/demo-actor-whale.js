import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";

// mr whale maintains a single massive order 20%-30% away from the true price,
// sparking conspiracy theories on reddit
class DemoActorWhale {
    
  /* eslint-disable no-unused-vars */
  constructor(bridge, actorAccount, direction, now) {
  /* eslint-enable no-unused-vars */
    this.bridge = bridge;
    this.baseDecimals = bridge.bookInfo.base.decimals;
    this.actorAccount = actorAccount;
    this.direction = direction;
    this.baseSize = 50000;
    this.spreadRatioTargetMin = 0.20;
    this.spreadRatioTargetMax = 0.30;
    this.interestingOrders = [];
    this.txnInProgress = false;
  }

  /* eslint-disable no-unused-vars */
  advance = (now, truePrice, trueSpread) => {
  /* eslint-enable no-unused-vars */

    let stillInterestingOrders = [];
    for (let order of this.interestingOrders) {
      let updatedOrder = order;
      try {
        // yes this is cheating
        updatedOrder = this.bridge.rx.getOrder(order.orderId);
      } catch (e) {
        // guess didn't reach exchange yet
      }
      if (updatedOrder.status === "Open" || updatedOrder.status === "NeedsGas" || updatedOrder.status === "Unknown") {
        stillInterestingOrders.push(updatedOrder);
      }
    }
    this.interestingOrders = stillInterestingOrders;

    if (this.txnInProgress) {
      return;
    }

    if (this.interestingOrders.length === 0) {
      // place order
      var targetSpread = truePrice * 0.5 * (this.spreadRatioTargetMin + this.spreadRatioTargetMax);
      var targetPrice = (this.direction === "Buy") ? truePrice - targetSpread : truePrice + targetSpread;
      this.txnInProgress = true;
      let orderId = UbiTokTypes.generateDecodedOrderIdAt(new Date(now));
      this.interestingOrders.push({
        orderId: orderId,
        status: "Unknown"
      });
      this.bridge._queueTxn(
        () => {
          this.bridge.rx.createOrder(
            this.actorAccount,
            orderId,
            this.direction + " @ " + targetPrice.toFixed(3),
            UbiTokTypes.encodeBaseAmount(this.baseSize, this.baseDecimals),
            "MakerOnly",
            0
          );
        }, {}, this._handleTxnEvent
      );
      return;
    }

    let firstOrder = this.interestingOrders[0];
    if (firstOrder.status === "Open") {
      let ourExistingPriceFmt = firstOrder.price;
      let ourExistingPrice = parseFloat(ourExistingPriceFmt.split(" @ ")[1]);
      let ourExistingSpread = (this.direction === "Buy") ? truePrice - ourExistingPrice : ourExistingPrice - truePrice;
      let ourExistingSpreadRatio = ourExistingSpread / truePrice;
      let ourExistingPriceInTolerance = ourExistingSpreadRatio >= this.spreadRatioTargetMin && ourExistingSpreadRatio <= this.spreadRatioTargetMax;
      if (!ourExistingPriceInTolerance) {
        this.txnInProgress = true;
        this.bridge._queueTxn(
          () => {
            this.bridge.rx.cancelOrder(
              this.actorAccount,
              firstOrder.orderId,
            );
          }, {}, this._handleTxnEvent
        );
      }
    }

  }

  _handleTxnEvent = (error, result) => {
    if (error || result.event === "Mined" || result.event === "FailedTxn") {
      this.txnInProgress = false;
    }
  }

}

export { DemoActorWhale as default };