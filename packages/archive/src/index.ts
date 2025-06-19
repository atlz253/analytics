import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import { randomUUID } from "node:crypto";
import { Storage } from "./storage.js";
import { unlink } from "node:fs/promises";
import { zipJSON } from "./archive.js";
import { storage as initStorage } from "./storage.js";
import { Readable } from "node:stream";
import { AbstractEvents } from "../../events/src/index.js";

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

export async function initArchive({
  events,
  storage,
}: {
  events: AbstractEvents;
  storage: { type: "RAM" | "mongo" };
}) {
  return new Archive({
    events,
    storage: await initStorage(storage),
  });
}
