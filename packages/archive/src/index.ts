import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import { randomUUID } from "node:crypto";
import { Storage } from "./storage.js";
import { unlink } from "node:fs/promises";
import { zipJSON } from "./archive.js";
import { storage as initStorage } from "./storage.js";
import { Readable } from "node:stream";
import { AbstractEvents } from "../../events/src/index.js";
import { MongoClientOptions } from "mongodb";

export abstract class AbstractArchive {
  abstract createEventsArchive(options: {
    timeInterval: TimeInterval;
  }): Promise<string>;

  abstract readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<Readable | undefined>;

  abstract dropDatabase(): Promise<void>;
}

export class ArchiveMock extends AbstractArchive {
  createEventsArchive(options: {
    timeInterval: TimeInterval;
  }): Promise<string> {
    throw new Error("Mocked");
  }

  readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<Readable | undefined> {
    throw new Error("Mocked");
  }

  dropDatabase(): Promise<void> {
    throw new Error("Mocked");
  }
}

export class Archive extends AbstractArchive {
  #events;
  #storage;

  constructor({
    events,
    storage,
  }: {
    events: AbstractEvents;
    storage: Storage;
  }) {
    super();
    this.#events = events;
    this.#storage = storage;
  }

  async createEventsArchive(options: { timeInterval: TimeInterval }) {
    const userEvents = await this.#events.readEvents(options);
    const path = await zipJSON({
      "events.json": userEvents,
    });
    const uuid = randomUUID();
    await this.#storage.createEventsArchive({ uuid, path });
    unlink(path);
    return uuid;
  }

  async readEventsArchive({ archiveUUID }: { archiveUUID: string }) {
    return await this.#storage.readEventsArchive({ archiveUUID });
  }

  async dropDatabase(): Promise<void> {
    await this.#storage.dropDatabase();
  }
}

class CloudFunctionArchive extends AbstractArchive {
  #fallback;

  constructor({ fallback }: { fallback: AbstractArchive }) {
    super();
    this.#fallback = fallback;
  }

  async createEventsArchive(options: {
    timeInterval: TimeInterval;
  }): Promise<string> {
    try {
      const response = await fetch(
        "https://d5dabihqt2mj59hvr4c0.svoluuab.apigw.yandexcloud.net/archive/events",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(options),
        }
      );
      const json = await response.json();
      const pathParts = new URL(json.archiveURL).pathname.split("/");
      return pathParts[pathParts.length - 1].replace(".zip", "");
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createEventsArchive(options);
    }
  }

  readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<Readable | undefined> {
    return this.#fallback.readEventsArchive(options);
  }

  async dropDatabase(): Promise<void> {
    await this.#fallback.dropDatabase();
  }
}

export async function initArchive({
  events,
  storage,
  cloudFunction,
}: {
  events: AbstractEvents;
  storage: {
    type: "RAM" | "mongo" | "YS3";
    host?: string;
    options?: MongoClientOptions;
  };
  cloudFunction?: boolean;
}) {
  const archive = new Archive({
    events,
    storage: await initStorage(storage),
  });
  return cloudFunction
    ? new CloudFunctionArchive({ fallback: archive })
    : archive;
}
