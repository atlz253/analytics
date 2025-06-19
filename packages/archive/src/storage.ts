import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { createReadStream, ReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { StreamRegistry } from "../../shared/src/StreamRegistry.js";

abstract class Storage {
  protected _readStreams;

  constructor({ readStreams }: { readStreams: StreamRegistry<ReadStream> }) {
    this._readStreams = readStreams;
  }

  abstract createEventsArchive(options: {
    uuid: string;
    path: string;
  }): Promise<void>;

  abstract readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<string | undefined>;
}

interface RAMStorageObject {
  eventArchives: { [uuid: string]: string };
}
export class RAMStorage extends Storage {
  #eventArchivesDirectory = join(tmpdir(), "analytics-archives");
  #storage: RAMStorageObject = {
    eventArchives: {},
  };

  async createEventsArchive({
    uuid,
    path,
  }: {
    uuid: string;
    path: string;
  }): Promise<void> {
    const fileName = basename(path);
    const destination = join(this.#eventArchivesDirectory, fileName);
    await mkdir(this.#eventArchivesDirectory, { recursive: true });
    await copyFile(path, destination);
    this.#storage.eventArchives[uuid] = destination;
  }

  async readEventsArchive({
    archiveUUID,
  }: {
    archiveUUID: string;
  }): Promise<string | undefined> {
    const path = this.#storage.eventArchives[archiveUUID];
    if (path === undefined) return undefined;
    const uuid = randomUUID();
    this._readStreams.set(uuid, createReadStream(path));
    return uuid;
  }
}
