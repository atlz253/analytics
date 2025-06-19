import {
  ImmutableEvent,
  ImmutableEventEmitter,
} from "../../shared/src/ImmutableEventEmitter.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import eventEventNames from "../../events/src/events.js";
import { randomUUID } from "node:crypto";
import { Storage } from "./storage.js";
import { unlink } from "node:fs/promises";
import { zipJSON } from "./archive.js";
import { UserActivityEvent } from "events/src/types.js";
import { storage as initStorage } from "./storage.js";
import { Readable } from "node:stream";

export abstract class AbstractArchive {
  abstract createEventsArchive(options: {
    timeInterval: TimeInterval;
  }): Promise<string>;

  abstract readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<Readable | undefined>;
}

export class MockArchive extends AbstractArchive {
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
}

export class Archive extends AbstractArchive {
  #events;
  #storage;

  constructor({
    events,
    storage,
  }: {
    events: ImmutableEventEmitter;
    storage: Storage;
  }) {
    super();
    this.#events = events;
    this.#storage = storage;
  }

  async createEventsArchive(options: { timeInterval: TimeInterval }) {
    const userEvents = (await this.#events.request(
      eventEventNames.readMultiple,
      eventEventNames.readMultipleAfter,
      options
    )) as Array<UserActivityEvent>;
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
}

export async function archive({
  events,
  storage,
}: {
  events: ImmutableEventEmitter;
  storage: { type: "RAM" | "mongo" };
}) {
  return new Archive({
    events,
    storage: await initStorage(storage),
  });
}
