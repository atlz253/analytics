import EventEmitter from "node:events";
import eventNames from "./events";
import { RAMStorage } from "./storage";

export class Events {
  #storage;

  constructor({ events, storage }: { events: EventEmitter; storage: "RAM" }) {
    this.#storage = new RAMStorage();
    events.on(eventNames.create, this.#createEvent.bind(this));
  }

  async #createEvent(event: object) {
    event.createTime = new Date().toISOString();
    await this.#storage.createEvent(event);
  }

  last() {
    return this.#storage.last();
  }
}
