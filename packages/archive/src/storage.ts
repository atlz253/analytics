import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { createReadStream, statSync } from "node:fs";
import { Db, GridFSBucket, MongoClient } from "mongodb";
import { Readable } from "node:stream";

export abstract class Storage {
  abstract createEventsArchive(options: {
    uuid: string;
    path: string;
  }): Promise<void>;

  abstract readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<Readable | undefined>;

  abstract dropDatabase(): Promise<void>;
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
  }): Promise<Readable | undefined> {
    const path = this.#storage.eventArchives[archiveUUID];
    if (path === undefined) return undefined;
    return createReadStream(path);
  }

  async dropDatabase(): Promise<void> {
    this.#storage = {
      eventArchives: {},
    };
  }
}

export class MongoStorage extends Storage {
  #db;
  #archivesBucket;

  constructor({ db }: { db: Db }) {
    super();
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
  }): Promise<Readable | undefined> {
    const fileInfo = await this.#archivesBucket
      .find({ filename: archiveUUID })
      .toArray();
    if (fileInfo.length === 0) return undefined;
    return this.#archivesBucket.openDownloadStream(fileInfo[0]._id);
  }

  async dropDatabase() {
    await this.#db.dropDatabase();
    this.#archivesBucket = new GridFSBucket(this.#db, {
      bucketName: "userEvents",
    });
  }
}

export async function storage({ type }: { type: "RAM" | "mongo" }) {
  switch (type) {
    case "RAM":
      return new RAMStorage();
    case "mongo":
      const client = new MongoClient("mongodb://root:example@mongodb:27017/");
      await client.connect();
      return new MongoStorage({ db: client.db("archive") });
  }
}
