import EventEmitter from "node:events";
import eventNames from "./events";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter";
import { storage as getStorage, Storage, StorageOptions } from "./storage";

class Events {
  #storage;

  constructor({ events, storage }: { events: EventEmitter; storage: Storage }) {
    this.#storage = storage;
    events.on(eventNames.create, this.#createEvent.bind(this));
  }

  async #createEvent(event: { createTime: string }) {
    event.createTime = new Date().toISOString();
    await this.#storage.createEvent(event);
  }

  last() {
    return this.#storage.last();
  }
}

export async function events({
  events,
  storage,
}: {
  events: ImmutableEventEmitter;
  storage: StorageOptions;
}) {
  return new Events({ events, storage: await getStorage(storage) });
}
