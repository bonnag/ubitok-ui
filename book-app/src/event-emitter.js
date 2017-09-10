// naughty way of getting some parent->child event comms for the
// 5% of cases where lifting state up doesn't seem to feel right
// if we do find ourselves doing this a lot consider e.g. MobX? Redux? Rx?

class EventEmitter {

  constructor() {
    this.subscribersById = {};
  }

  emit = (data) => {
    for (let subscriberId in this.subscribersById) {
      this.subscribersById[subscriberId](data);
    }
  };

  subscribe = (subscriberId, callback) => {
    this.subscribersById[subscriberId] = callback;
  }

}

export default EventEmitter;
