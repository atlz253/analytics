import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";

abstract class Storage {
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

  constructor() {
    super();
  }

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
    return this.#storage.eventArchives[archiveUUID];
  }
}
