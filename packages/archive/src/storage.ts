import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { createReadStream, ReadStream, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { StreamRegistry } from "../../shared/src/StreamRegistry.js";
import { Db, GridFSBucket, MongoClient } from "mongodb";
import { Readable } from "node:stream";

export abstract class Storage {
  protected _readStreams;

  constructor({ readStreams }: { readStreams: StreamRegistry<Readable> }) {
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

export class MongoStorage extends Storage {
  #db;
  #archivesBucket;

  constructor({
    readStreams,
    db,
  }: {
    readStreams: StreamRegistry<Readable>;
    db: Db;
  }) {
    super({ readStreams });
    this.#db = db;
    this.#archivesBucket = new GridFSBucket(db, { bucketName: "userEvents" });
  }

  createEventsArchive({
    uuid,
    path,
  }: {
    uuid: string;
    path: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileStats = statSync(path);
      const readStream = createReadStream(path);
      const uploadStream = this.#archivesBucket
        .openUploadStream(uuid, {
          metadata: {
            originalSize: fileStats.size,
            uploadDate: new Date(),
            contentType: "application/zip",
          },
        })
        .on("error", (error) => reject(error))
        .on("finish", () => resolve());
      readStream.pipe(uploadStream);
    });
  }

  async readEventsArchive({
    archiveUUID,
  }: {
    archiveUUID: string;
  }): Promise<string | undefined> {
    const fileInfo = await this.#archivesBucket
      .find({ filename: archiveUUID })
      .toArray();
    if (fileInfo.length === 0) return undefined;
    const downloadStream = this.#archivesBucket.openDownloadStream(
      fileInfo[0]._id
    );
    const uuid = randomUUID();
    this._readStreams.set(uuid, downloadStream);
    return uuid;
  }
}

export async function storage({
  type,
  readStreams,
}: {
  type: "RAM" | "mongo";
  readStreams: StreamRegistry<Readable>;
}) {
  switch (type) {
    case "RAM":
      return new RAMStorage({ readStreams });
    case "mongo":
      const client = new MongoClient("mongodb://root:example@mongodb:27017/");
      await client.connect();
      return new MongoStorage({ readStreams, db: client.db("archive") });
  }
}
