import { Db, MongoClient } from "mongodb";

type StorageType = "RAM" | "mongo";

export abstract class Storage {
  abstract createEvent(event: object): Promise<void>;

  abstract last(): Promise<object | undefined>;
}

class RAMStorage extends Storage {
  #storage: { events: object[] } = {
    events: [],
  };

  async createEvent(event: object) {
    this.#storage.events.push(event);
  }

  async last() {
    return this.#storage.events.at(-1);
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
}

export async function storage(type: StorageType) {
  switch (type) {
    case "RAM":
      return new RAMStorage();
    case "mongo":
      const client = new MongoClient("mongodb://root:example@mongodb:27017/");
      await client.connect();
      return new MongoStorage({ db: client.db("events") });
  }
}
