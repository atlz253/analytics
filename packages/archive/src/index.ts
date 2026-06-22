import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { Readable } from "node:stream";

import { AbstractEvents } from "@atlz253/events";
import { TimeInterval } from "@atlz253/shared/types/timeInterval";
import { SQS } from "aws-sdk";
import { z } from "zod";

import { zipJSON } from "./archive.js";
import { Storage, storageOptionsSchema } from "./storage.js";
import { storage as initStorage } from "./storage.js";

const QUEUE_REPLY_WAIT_TIMEOUT = 30000;

export const configSchema = z.object({
  storage: storageOptionsSchema,
  cloudFunction: z.boolean().optional(),
  cloudFunctionArchive: z
    .object({
      credentials: z.object({
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
      }),
      requestQueueURL: z.string(),
      responseQueueURL: z.string(),
    })
    .optional(),
});
type ConfigSchema = z.infer<typeof configSchema>;

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
  createEventsArchive(_options: {
    timeInterval: TimeInterval;
  }): Promise<string> {
    throw new Error("Mocked");
  }

  readEventsArchive(_options: {
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

export class CloudFunctionArchive extends AbstractArchive {
  #fallback: AbstractArchive;
  #messageQueue: SQS;
  #requestQueueURL: string;
  #responseQueueURL: string;

  constructor({
    requestQueueURL,
    responseQueueURL,
    credentials,
    dependencies: { fallback },
  }: {
    requestQueueURL: string;
    responseQueueURL: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
    };
    dependencies: { fallback: AbstractArchive };
  }) {
    super();
    this.#fallback = fallback;
    this.#requestQueueURL = requestQueueURL;
    this.#responseQueueURL = responseQueueURL;
    this.#messageQueue = new SQS({
      region: "ru-central1",
      endpoint: "https://message-queue.api.cloud.yandex.net",
      credentials: credentials,
    });
  }

  async createEventsArchive(options: {
    timeInterval: TimeInterval;
  }): Promise<string> {
    try {
      const correlationId = randomUUID();

      await this.#messageQueue
        .sendMessage({
          QueueUrl: this.#requestQueueURL,
          MessageBody: JSON.stringify({ archiveRequest: options }),
          MessageAttributes: {
            correlationId: {
              DataType: "String",
              StringValue: correlationId,
            },
            replyQueueUrl: {
              DataType: "String",
              StringValue: this.#responseQueueURL,
            },
          },
        })
        .promise();

      const started = Date.now();

      while (Date.now() - started < QUEUE_REPLY_WAIT_TIMEOUT) {
        const res = await this.#messageQueue
          .receiveMessage({
            QueueUrl: this.#responseQueueURL,
            WaitTimeSeconds: 1,
            MaxNumberOfMessages: 100,
            MessageAttributeNames: ["All"],
          })
          .promise();

        for (const msg of res.Messages || []) {
          const replyCorrelationId =
            msg.MessageAttributes?.correlationId?.StringValue;

          if (replyCorrelationId === correlationId) {
            await this.#messageQueue
              .deleteMessage({
                QueueUrl: this.#responseQueueURL,
                ReceiptHandle: msg.ReceiptHandle!,
              })
              .promise();

            const json = JSON.parse(msg.Body!);
            if (json.errorCode) throw new Error(JSON.stringify(json));
            const pathParts = new URL(json.archiveURL).pathname.split("/");
            return pathParts[pathParts.length - 1].replace(".zip", "");
          }
        }
      }

      throw new Error("Истекло время ожидания ответа");
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createEventsArchive(options);
    }
  }

  readEventsArchive(options: {
    archiveUUID: string;
  }): Promise<Readable | undefined> {
    return this.#fallback.readEventsArchive(options);
  }

  async dropDatabase(): Promise<void> {
    await this.#fallback.dropDatabase();
  }
}

export async function initArchive({
  storage,
  cloudFunction,
  cloudFunctionArchive,
  dependencies: { events },
}: ConfigSchema & { dependencies: { events: AbstractEvents } }) {
  const archive = new Archive({
    events,
    storage: await initStorage(storage),
  });
  return cloudFunction
    ? new CloudFunctionArchive({
        ...cloudFunctionArchive!,
        dependencies: { fallback: archive },
      })
    : archive;
}
