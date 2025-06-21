import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { createReadStream, statSync } from "node:fs";
import { Db, GridFSBucket, MongoClient, MongoClientOptions } from "mongodb";
import { Readable } from "node:stream";
import {
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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

export class YandexObjectStorage extends Storage {
  #client;

  constructor({ client }: { client: S3Client }) {
    super();
    this.#client = client;
  }

  async createEventsArchive({
    uuid,
    path,
  }: {
    uuid: string;
    path: string;
  }): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: "events-archives",
      Key: `events/${uuid}.zip`,
      Body: createReadStream(path),
      ACL: ObjectCannedACL.public_read,
    });
    await this.#client.send(command);
  }

  readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<Readable | undefined> {
    throw new Error("Method not implemented.");
  }

  dropDatabase(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export async function storage({
  type,
  host,
  options,
}: {
  type: "RAM" | "mongo" | "YS3";
  host?: string;
  options?: MongoClientOptions;
}) {
  switch (type) {
    case "RAM":
      return new RAMStorage();
    case "mongo":
      const client = new MongoClient(
        host ?? "mongodb://root:example@mongodb:27017/",
        options
      );
      await client.connect();
      return new MongoStorage({ db: client.db("archive") });
    case "YS3":
      const s3Client = new S3Client({
        endpoint: "https://storage.yandexcloud.net",
        credentials: {
          accessKeyId: "YCAJE8Cg_5A5fnSON4hm3GzJD", // Replace with your access key
          secretAccessKey: "YCPOn8nx_EZvVGPB9_i_TmYf7v1RZ73OCO2UBzIP", // Replace with your secret key
        },
        region: "ru-central1", // Specify your region if required
      });
      return new YandexObjectStorage({ client: s3Client });
  }
}
