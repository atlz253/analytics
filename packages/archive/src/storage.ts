import { createReadStream, statSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";

import {
  MongoClientOptionsSchema,
  mongoClientOptionsSchema,
} from "@atlz253/shared/mongo";
import {
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Db, GridFSBucket, MongoClient } from "mongodb";
import { z } from "zod";

const yandexS3OptionsSchema = z.object({
  region: z.string(),
  credentials: z.object({
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
  }),
});
type YandexS3OptionsSchema = z.infer<typeof yandexS3OptionsSchema>;

export const storageOptionsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RAM") }),
  mongoClientOptionsSchema.extend({ type: z.literal("mongo") }),
  yandexS3OptionsSchema.extend({ type: z.literal("YS3") }),
]);
type StorageOptionsSchema = z.infer<typeof storageOptionsSchema>;

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

  readEventsArchive(_options: {
    archiveUUID: string;
  }): Promise<Readable | undefined> {
    throw new Error("Method not implemented.");
  }

  dropDatabase(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export async function storage({ type, ...options }: StorageOptionsSchema) {
  switch (type) {
    case "RAM":
      return new RAMStorage();
    case "mongo": {
      const {
        user,
        password,
        hosts,
        port,
        options: mongoOptions,
      } = options as MongoClientOptionsSchema;
      const client = new MongoClient(
        `mongodb://${user}:${password}@${hosts}:${port}/`,
        mongoOptions
      );
      await client.connect();
      return new MongoStorage({ db: client.db("archive") });
    }
    case "YS3": {
      const { region, credentials } = options as YandexS3OptionsSchema;
      // TODO: пробрасывать значения через конфиги
      const s3Client = new S3Client({
        region,
        credentials: { ...credentials },
        endpoint: "https://storage.yandexcloud.net",
      });
      return new YandexObjectStorage({ client: s3Client });
    }
  }
}
