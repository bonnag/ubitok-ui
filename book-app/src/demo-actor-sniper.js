import UbiTokTypes from "ubitok-jslib/ubi-tok-types.js";
import Random from "random-js";

// the sniper pops up infrequently and chucks in an IoC order
// slightly more aggressive than true price
class DemoActorSniper {
    
  constructor(bridge, actorAccount, direction, now) {
    this.bridge = bridge;
    this.actorAccount = actorAccount;
    this.direction = direction;
    this.baseSizes = [2.5, 5, 10, 12, 20, 25, 50];
    this.spreadRatioTarget = 0.10;
    this.lastOrderAt = undefined;
    this.rng = new Random(Random.engines.mt19937().seed(Math.floor(now / 1000)));
    this.gapsSeconds = [45, 23, 73, 38];
    this.gapIndex = this.rng.integer(0, this.gapsSeconds.length - 1);
  }

  /* eslint-disable no-unused-vars */
  advance = (now, truePrice, trueSpread) => {
  /* eslint-enable no-unused-vars */

    if (this.txnInProgress) {
      return;
    }

    if (this.lastOrderAt === undefined) {
      this.lastOrderAt = now;
    }
    if (now - this.lastOrderAt < this.gapsSeconds[this.gapIndex] * 1000) {
      return;
    }

    this.lastOrderAt = now;
    this.gapIndex++;
    if (this.gapIndex >= this.gapsSeconds.length) {
      this.gapIndex = 0;
    }

    // place order (fire and forget)
    var targetSpread = truePrice * this.spreadRatioTarget;
    var targetPrice = (this.direction === "Buy") ? truePrice + targetSpread : truePrice - targetSpread;
    let orderId = UbiTokTypes.generateDecodedOrderIdAt(new Date(now));
    /* eslint-disable no-unused-vars */
    this.bridge._queueTxn(
      () => {
        this.bridge.rx.createOrder(
          this.actorAccount,
          orderId,
          this.direction + " @ " + targetPrice.toFixed(3),
          UbiTokTypes.encodeBaseAmount(this.rng.pick(this.baseSizes)),
          "ImmediateOrCancel",
          5
        );
      }, {}, (err, res) => {}
    );
    /* eslint-enable no-unused-vars */
    return;
  }

}

export { DemoActorSniper as default };