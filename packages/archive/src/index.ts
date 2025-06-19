import {
  ImmutableEvent,
  ImmutableEventEmitter,
} from "../../shared/src/ImmutableEventEmitter.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import archiveEventNames from "./events.js";
import eventEventNames from "../../events/src/events.js";
import { randomUUID } from "node:crypto";
import { RAMStorage } from "./storage.js";
import { unlink } from "node:fs/promises";
import { zipJSON } from "./archive.js";
import { UserActivityEvent } from "events/src/types.js";

export class Archive {
  #events;
  #storage = new RAMStorage();

  constructor({ events }: { events: ImmutableEventEmitter }) {
    this.#events = events;
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
    const path = await this.#storage.readEventsArchive({ archiveUUID });
    this.#events.emit(archiveEventNames.readEventsArchiveAfter, {
      ...event,
      response: { path, found: path !== undefined },
    });
  }
}
