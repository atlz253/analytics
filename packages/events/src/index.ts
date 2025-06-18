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
        [eventNames.dropDatabase, this.#dropDatabase.bind(this)],
      ] as const
    ).forEach(([e, c]) => events.on(e, c));
  }

  async #createEvents(event: ImmutableEvent<[Array<UserActivityEvent>]>) {
    const [events] = event.args;
    await Promise.all(events.map((e) => this.#createEvent({ args: [e] })));
    this.#events.emit(eventNames.createMultipleAfter, event);
  }

  async #createEvent(event: ImmutableEvent<[UserActivityEvent]>) {
    const [userEvent] = event.args;
    userEvent.createTime = new Date();
    await this.#storage.createEvent(userEvent);
    this.#events.emit(eventNames.createAfter, event);
  }

  async #readEvents(event: ImmutableEvent<[{ timeInterval: TimeInterval }]>) {
    const [options] = event.args;
    const events = await this.#storage.readEvents(options);
    this.#events.emit(eventNames.readMultipleAfter, {
      ...event,
      response: events,
    });
  }

  #dropDatabase(event: ImmutableEvent) {
    this.#storage.drop();
    this.#events.emit(eventNames.dropDatabaseAfter, event);
  }

  // TODO: убрать
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
