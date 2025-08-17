import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { UserActivityEvent } from "./types.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import { z } from "zod";

const RAMStorageOptionsSchema = z.object({
  // TODO: убрать эту возможность
  storage: z.custom<RAMStorageObject>().optional(),
});
type RAMStorageOptions = z.infer<typeof RAMStorageOptionsSchema>;

const mongoStorageOptionsSchema = z.object({
  user: z.string(),
  password: z.string(),
  hosts: z.string(),
  port: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => parseInt(val)),
  options: z.custom<MongoClientOptions>().optional(),
});
type MongoStorageOptions = z.infer<typeof mongoStorageOptionsSchema>;

export const storageOptionsSchema = z.discriminatedUnion("type", [
  RAMStorageOptionsSchema.extend({ type: z.literal("RAM") }),
  mongoStorageOptionsSchema.extend({ type: z.literal("mongo") }),
]);

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

export interface RAMStorageObject {
  events: Array<UserActivityEvent>;
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

export async function storage({
  type,
  ...options
}: z.infer<typeof storageOptionsSchema>) {
  switch (type) {
    case "RAM":
      return new RAMStorage(options as RAMStorageOptions);
    case "mongo":
      const {
        user,
        password,
        hosts,
        port,
        options: mongoOptions,
      } = options as MongoStorageOptions;
      const client = new MongoClient(
        `mongodb://${user}:${password}@${hosts}:${port}/`,
        mongoOptions
      );
      await client.connect();
      return new MongoStorage({ db: client.db("events") });
  }
}
