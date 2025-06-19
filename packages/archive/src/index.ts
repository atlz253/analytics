import {
  ImmutableEvent,
  ImmutableEventEmitter,
} from "../../shared/src/ImmutableEventEmitter.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import archiveEventNames from "./events.js";
import eventEventNames from "../../events/src/events.js";
import { randomUUID } from "node:crypto";
import { Storage } from "./storage.js";
import { unlink } from "node:fs/promises";
import { zipJSON } from "./archive.js";
import { UserActivityEvent } from "events/src/types.js";
import { StreamRegistry } from "../../shared/src/StreamRegistry.js";
import { storage as initStorage } from "./storage.js";
import { Readable } from "node:stream";

class Archive {
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
        [
          archiveEventNames.createEventsArchive,
          this.#createEventsArchive.bind(this),
        ],
        [
          archiveEventNames.readEventsArchive,
          this.#readEventsArchive.bind(this),
        ],
      ] as const
    ).map(([e, c]) => events.on(e, c));
  }

  async #createEventsArchive(
    event: ImmutableEvent<[{ timeInterval: TimeInterval }]>
  ) {
    const [options] = event.args;
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
    this.#events.emit(archiveEventNames.createEventsArchiveAfter, {
      ...event,
      response: { archiveUUID: uuid },
    });
  }

  async #readEventsArchive(event: ImmutableEvent<[{ archiveUUID: string }]>) {
    const [{ archiveUUID }] = event.args;
    const streamUUID = await this.#storage.readEventsArchive({ archiveUUID });
    this.#events.emit(archiveEventNames.readEventsArchiveAfter, {
      ...event,
      response: { streamUUID, found: streamUUID !== undefined },
    });
  }
}

export async function archive({
  events,
  readStreams,
  storage,
}: {
  events: ImmutableEventEmitter;
  readStreams: StreamRegistry<Readable>;
  storage: { type: "RAM" | "mongo" };
}) {
  return new Archive({
    events,
    storage: await initStorage({ ...storage, readStreams }),
  });
}
