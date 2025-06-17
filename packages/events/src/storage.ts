import { Db, MongoClient } from "mongodb";
import { UserActivityEvent } from "./types.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";

export type StorageType = "RAM" | "mongo";

export abstract class Storage {
  abstract createEvent(event: object): Promise<void>;

  abstract last(): Promise<object | undefined>;

  abstract readEvents(options: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>>;
}

interface RAMStorageObject {
  events: Array<UserActivityEvent>;
}

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

  async createEvent(event: UserActivityEvent) {
    this.#storage.events.push(event);
  }

  async last() {
    return this.#storage.events.at(-1);
  }

  async readEvents({
    timeInterval,
  }: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    return this.#storage.events.filter(
      (e) =>
        new Date(e.occurrenceTime) >= new Date(timeInterval.start) &&
        (timeInterval.end === undefined ||
          new Date(e.occurrenceTime) <= new Date(timeInterval.end))
    );
  }
}

class MongoStorage extends Storage {
  #db;

  constructor({ db }: { db: Db }) {
    super();
    this.#db = db;
  }

  async createEvent(event: object) {
    await this.#db.collection("userActivity").insertOne(event);
  }

  async last(): Promise<object | undefined> {
    return this.#db
      .collection("userActivity")
      .findOne({}, { sort: { _id: -1 } }) as Promise<object | undefined>;
  }

  readEvents(options: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    throw new Error("not implemented");
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
