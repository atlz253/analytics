import eventNames from "./events.js";
import {
  ImmutableEvent,
  ImmutableEventEmitter,
} from "../../shared/src/ImmutableEventEmitter.js";
import { storage as getStorage, Storage, StorageOptions } from "./storage.js";
import { UserActivityEvent } from "./types.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";

class Events {
  #events;
  #storage;

  constructor({
    events,
    storage,
  }: {
    events: ImmutableEventEmitter;
    storage: Storage;
  }) {
    this.#events = events;
    this.#storage = storage;
    (
      [
        [eventNames.create, this.#createEvent.bind(this)],
        [eventNames.createMultiple, this.#createEvents.bind(this)],
        [eventNames.readMultiple, this.#readEvents.bind(this)],
      ] as const
    ).forEach(([e, c]) => events.on(e, c));
  }

  async #createEvents(event: ImmutableEvent<[Array<UserActivityEvent>]>) {
    const [events] = event.args;
    await Promise.all(events.map((e) => this.#createEvent(e)));
    this.#events.emit(eventNames.createMultipleAfter, event);
  }

  async #createEvent(event: UserActivityEvent) {
    event.createTime = new Date().toISOString();
    await this.#storage.createEvent(event);
  }

  async #readEvents(event: ImmutableEvent<[{ timeInterval: TimeInterval }]>) {
    const [options] = event.args;
    const events = await this.#storage.readEvents(options);
    this.#events.emit(eventNames.readMultipleAfter, {
      ...event,
      response: events,
    });
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
