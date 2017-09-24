import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
import Random from "random-js";

// the stacker normally keeps two orders out on each side,
// positioned roughly as far from the true price as the true uncertainty.
// to avoid annoying everyone they have a minimum order lifetime of ~30 seconds
class DemoActorStacker {
    
  constructor(bridge, actorAccount, direction, now) {
    this.bridge = bridge;
    this.actorAccount = actorAccount;
    this.direction = direction;
    this.interestingOrders = [];
    this.rng = new Random(Random.engines.mt19937().seed(Math.floor(now / 1000)));
    this.orderExpiresAt = {};
    this.minLifetimes = [30, 45, 60, 90];
    this.txnInProgress = false;
  }

  advance = (now, truePrice, trueSpread) => {

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

    var targetSpread = trueSpread * 1.25;
    var targetPrice1 = (this.direction === "Buy") ? truePrice - targetSpread : truePrice + targetSpread;
    var targetPrice2 = (this.direction === "Buy") ? targetPrice1 - 0.01 : targetPrice1 + 0.01;

    var desiredOrders = [
      {
        price: this.direction + " @ " + (targetPrice1 + 1e-8).toFixed(3),
        sizeBase: UbiTokTypes.encodeBaseAmount(100),
        found: false
      },
      {
        price: this.direction + " @ " + (targetPrice2 + 1e-8).toFixed(3),
        sizeBase: UbiTokTypes.encodeBaseAmount(250),
        found: false
      }
    ];

    for (var existingOrder of this.interestingOrders) {
      this._checkStillWantExisting(now, existingOrder, desiredOrders);
      if (this.txnInProgress) {
        return;
      }
    }
   
    for (var desiredOrder of desiredOrders) {
      if (!desiredOrder.found && this.interestingOrders.length < desiredOrders.length) {
        this._createDesired(now, desiredOrder);
      }
    }

  }

  _checkStillWantExisting = (now, existingOrder, desiredOrders) => {
    let stillWant = false;
    for (var desiredOrder of desiredOrders) {
      if ( existingOrder.price === desiredOrder.price &&
           existingOrder.sizeBase.equals(desiredOrder.sizeBase) ) {
        desiredOrder.found = true;
        stillWant = true;
        break;
      }
    }
    if (!stillWant) {
      let expiresAt = this.orderExpiresAt[existingOrder.orderId];
      if (now < expiresAt) {
        // want to cancel but not allowed
        return;
      }
      this.txnInProgress = true;
      this.bridge._queueTxn(
        () => {
          this.bridge.rx.cancelOrder(
            this.actorAccount,
            existingOrder.orderId,
          );
        }, {}, this._handleTxnEvent
      );
      return;
    }
  }

  _createDesired = (now, desiredOrder) => {
    this.txnInProgress = true;
    let orderId = UbiTokTypes.generateDecodedOrderIdAt(new Date(now));
    this.orderExpiresAt[orderId] = now + 1000 * this.rng.pick(this.minLifetimes);
    this.interestingOrders.push({
      orderId: orderId,
      status: "Unknown"
    });
    this.bridge._queueTxn(
      () => {
        this.bridge.rx.createOrder(
          this.actorAccount,
          orderId,
          desiredOrder.price,
          desiredOrder.sizeBase,
          "GTCNoGasTopup",
          3
        );
      }, {}, this._handleTxnEvent
    );
  }

  _handleTxnEvent = (error, result) => {
    if (error || result.event === "Mined" || result.event === "FailedTxn") {
      this.txnInProgress = false;
    }
  }

}

export { DemoActorStacker as default };