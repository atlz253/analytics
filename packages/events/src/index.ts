import { storage as getStorage, Storage, StorageOptions } from "./storage.js";
import { UserActivityEvent } from "./types.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";

export abstract class AbstractEvents {
  abstract createEvents(events: Array<UserActivityEvent>): Promise<void>;

  abstract createEvent(event: UserActivityEvent): Promise<void>;

  abstract readEvents(options: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>>;

  abstract dropDatabase(): Promise<void>;

  // TODO: убрать
  abstract last(): Promise<UserActivityEvent | undefined>;
}

export class EventsMock extends AbstractEvents {
  createEvents(events: Array<UserActivityEvent>): Promise<void> {
    throw new Error("Mock");
  }

  createEvent(event: UserActivityEvent): Promise<void> {
    throw new Error("Mock");
  }

  readEvents(options: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    throw new Error("Mock");
  }

  dropDatabase(): Promise<void> {
    throw new Error("Mock");
  }

  last(): Promise<UserActivityEvent | undefined> {
    throw new Error("Mock");
  }
}

class Events extends AbstractEvents {
  #storage;

  constructor({ storage }: { storage: Storage }) {
    super();
    this.#storage = storage;
  }

  async createEvents(events: Array<UserActivityEvent>) {
    const createTime = new Date();
    await this.#storage.createEvents(events.map((e) => ({ ...e, createTime })));
  }

  async createEvent(event: UserActivityEvent) {
    event.createTime = new Date();
    await this.#storage.createEvent(event);
  }

  async readEvents(options: { timeInterval: TimeInterval }) {
    return await this.#storage.readEvents(options);
  }

  async dropDatabase() {
    await this.#storage.drop();
  }

  // TODO: убрать
  /**
   * @deprecated
   */
  last() {
    return this.#storage.last() as Promise<UserActivityEvent | undefined>;
  }
}

class CloudFunctionEvents extends AbstractEvents {
  #fallback;

  constructor({ fallback }: { fallback: AbstractEvents }) {
    super();
    this.#fallback = fallback;
  }

  async createEvents(events: Array<UserActivityEvent>): Promise<void> {
    const promises = events.map((e) => this.createEvent(e));
    await Promise.all(promises);
  }

  async createEvent(event: UserActivityEvent): Promise<void> {
    try {
      const response = await fetch(
        "https://functions.yandexcloud.net/d4e6k9suiftpt7s9ru3g",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const json = await response.json();
      if (json.errorCode) throw new Error(JSON.stringify(json));
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      await this.#fallback.createEvent(event);
    }
  }

  readEvents(options: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    return this.#fallback.readEvents(options);
  }

  dropDatabase(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  last(): Promise<UserActivityEvent | undefined> {
    throw new Error("Method not implemented.");
  }
}

export async function initEvents({
  storage,
  cloudFunction,
}: {
  storage: StorageOptions;
  cloudFunction?: boolean;
}) {
  const events = new Events({ storage: await getStorage(storage) });
  return cloudFunction ? new CloudFunctionEvents({ fallback: events }) : events;
}
