import { Db, MongoClient } from "mongodb";
import { UserActivityEvent } from "./types.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";

export type StorageType = "RAM" | "mongo";

export abstract class Storage {
  abstract createEvent(event: UserActivityEvent): Promise<void>;

  abstract createEvents(events: UserActivityEvent[]): Promise<void>;

  abstract last(): Promise<object | undefined>;

  abstract readEvents(options: {
    userUUID?: string;
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>>;

  abstract drop(): Promise<void>;
}

interface RAMStorageObject {
  events: Array<UserActivityEvent>;
}

// TODO: убрать эту возможность
interface RAMStorageOptions {
  storage?: RAMStorageObject;
}

class RAMStorage extends Storage {
  #storage;

  constructor({
    storage = {
      events: [],
    },
  }: RAMStorageOptions = {}) {
    super();
    this.#storage = storage;
  }

  async createEvents(events: UserActivityEvent[]): Promise<void> {
    await Promise.all(events.map(this.createEvent.bind(this)));
  }

  async createEvent(event: UserActivityEvent) {
    this.#storage.events.push(structuredClone(event));
  }

  async last() {
    return structuredClone(this.#storage.events.at(-1));
  }

  async readEvents({
    userUUID,
    timeInterval,
  }: {
    userUUID?: string;
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    return structuredClone(
      this.#storage.events
        .filter(
          (e) =>
            new Date(e.occurrenceTime) >= new Date(timeInterval.start) &&
            (timeInterval.end === undefined ||
              new Date(e.occurrenceTime) <= new Date(timeInterval.end))
        )
        .filter((e) => userUUID === undefined || e.userUUID === userUUID)
    );
  }

  async drop(): Promise<void> {
    this.#storage = {
      events: [],
    };
  }
}

class MongoStorage extends Storage {
  #db;

  constructor({ db }: { db: Db }) {
    super();
    this.#db = db;
  }

  async createEvent(event: UserActivityEvent) {
    await this.#db.collection("userActivity").insertOne(event);
  }

  async createEvents(events: UserActivityEvent[]): Promise<void> {
    await this.#db.collection("userActivity").insertMany(events);
  }

  last(): Promise<object | undefined> {
    return this.#db
      .collection("userActivity")
      .findOne({}, { sort: { _id: -1 } }) as Promise<object | undefined>;
  }

  readEvents({
    userUUID,
    timeInterval,
  }: {
    userUUID?: string;
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    let result = this.#db.collection("userActivity").find({
      occurrenceTime: {
        $gte: new Date(timeInterval.start),
        ...(timeInterval.end === undefined
          ? {}
          : { $lte: new Date(timeInterval.end) }),
      },
      ...(userUUID === undefined ? {} : { userUUID }),
    });
    return result.toArray() as unknown as Promise<Array<UserActivityEvent>>;
  }

  async drop(): Promise<void> {
    await this.#db.dropDatabase();
  }
}

export type StorageOptions =
  | (RAMStorageOptions & { type: "RAM" })
  | { type: "mongo" };

export async function storage({ type, ...options }: StorageOptions) {
  switch (type) {
    case "RAM":
      return new RAMStorage(options);
    case "mongo":
      const client = new MongoClient("mongodb://root:example@mongodb:27017/");
      await client.connect();
      return new MongoStorage({ db: client.db("events") });
  }
}
