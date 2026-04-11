import { randomUUID } from "node:crypto";

import { UserActivityEvent } from "@atlz253/events/types";
import { SQS } from "aws-sdk";

import { AbstractEvents } from "../../events/src/index.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";
import { EventTypesReport, UserReport, UsersReport } from "./types.js";

const QUEUE_REPLY_WAIT_TIMEOUT = 60000;

export abstract class AbstractReport {
  abstract createUsersReport(event: {
    timeInterval: TimeInterval;
  }): Promise<UsersReport>;

  abstract createUserReport(event: {
    userUUID: string;
    timeInterval: TimeInterval;
  }): Promise<UserReport>;

  abstract createEventTypesReport(event: {
    timeInterval: TimeInterval;
  }): Promise<EventTypesReport>;

  abstract createEventsReport(event: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>>;
}

export class ReportMock extends AbstractReport {
  createUsersReport(_event: {
    timeInterval: TimeInterval;
  }): Promise<UsersReport> {
    throw new Error("Mock");
  }

  createUserReport(_event: {
    userUUID: string;
    timeInterval: TimeInterval;
  }): Promise<UserReport> {
    throw new Error("Mock");
  }

  createEventTypesReport(_event: {
    timeInterval: TimeInterval;
  }): Promise<EventTypesReport> {
    throw new Error("Mock");
  }

  createEventsReport(_event: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    throw new Error("Mock");
  }
}

export class Report extends AbstractReport {
  #events;

  constructor({
    dependencies: { events },
  }: {
    dependencies: { events: AbstractEvents };
  }) {
    super();
    this.#events = events;
  }

  async createUsersReport(options: { timeInterval: TimeInterval }) {
    const events = await this.#events.readEvents(options);
    const usersUUID = new Set(events.map((e) => e.userUUID));
    const result: UsersReport = {};
    usersUUID.forEach(
      (uuid) =>
        (result[uuid] = {
          eventsCount: events.filter((e) => e.userUUID === uuid).length,
        }),
    );
    return result;
  }

  async createUserReport(options: {
    userUUID: string;
    timeInterval: TimeInterval;
  }) {
    const events = await this.#events.readEvents(options);
    const eventsData: UserReport = { events: {} };
    events.forEach((e) =>
      e.type in eventsData.events
        ? (eventsData.events[e.type].count =
            eventsData.events[e.type].count + 1)
        : (eventsData.events[e.type] = { count: 1 }),
    );
    return eventsData;
  }

  async createEventTypesReport(options: { timeInterval: TimeInterval }) {
    const events = await this.#events.readEvents(options);
    const report: EventTypesReport = { events: {} };
    events.forEach((e) =>
      report.events[e.type] === undefined
        ? (report.events[e.type] = { count: 1 })
        : (report.events[e.type].count = report.events[e.type].count + 1),
    );
    return report;
  }

  async createEventsReport(options: { timeInterval: TimeInterval }) {
    const events = await this.#events.readEvents(options);
    return events;
  }
}

export class CloudFunctionReport extends AbstractReport {
  #messageQueue: SQS;
  #requestQueueURL: string;
  #responseQueueURL: string;
  #fallback: AbstractReport;

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
    dependencies: { fallback: AbstractReport };
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

  async createUsersReport(event: {
    timeInterval: TimeInterval;
  }): Promise<UsersReport> {
    try {
      const correlationId = randomUUID();

      await this.#messageQueue
        .sendMessage({
          QueueUrl: this.#requestQueueURL,
          MessageBody: JSON.stringify({
            reportType: "users",
            event,
          }),
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
            WaitTimeSeconds: 20,
            MaxNumberOfMessages: 10,
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

            return JSON.parse(msg.Body!);
          }
        }
      }

      throw new Error("Истекло время ожидания ответа");
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createUsersReport(event);
    }
  }

  async createUserReport(event: {
    userUUID: string;
    timeInterval: TimeInterval;
  }): Promise<UserReport> {
    try {
      const correlationId = randomUUID();

      await this.#messageQueue
        .sendMessage({
          QueueUrl: this.#requestQueueURL,
          MessageBody: JSON.stringify({
            reportType: "user",
            event,
          }),
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
            WaitTimeSeconds: 20,
            MaxNumberOfMessages: 10,
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

            return JSON.parse(msg.Body!);
          }
        }
      }

      throw new Error("Истекло время ожидания ответа");
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createUserReport(event);
    }
  }

  async createEventTypesReport(event: {
    timeInterval: TimeInterval;
  }): Promise<EventTypesReport> {
    try {
      const correlationId = randomUUID();

      await this.#messageQueue
        .sendMessage({
          QueueUrl: this.#requestQueueURL,
          MessageBody: JSON.stringify({
            reportType: "eventTypes",
            event,
          }),
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
            WaitTimeSeconds: 20,
            MaxNumberOfMessages: 10,
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

            return JSON.parse(msg.Body!);
          }
        }
      }

      throw new Error("Истекло время ожидания ответа");
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createEventTypesReport(event);
    }
  }

  async createEventsReport(event: {
    timeInterval: TimeInterval;
  }): Promise<Array<UserActivityEvent>> {
    try {
      const correlationId = randomUUID();

      await this.#messageQueue
        .sendMessage({
          QueueUrl: this.#requestQueueURL,
          MessageBody: JSON.stringify({
            reportType: "events",
            event,
          }),
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
            WaitTimeSeconds: 20,
            MaxNumberOfMessages: 10,
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

            return JSON.parse(msg.Body!);
          }
        }
      }

      throw new Error("Истекло время ожидания ответа");
    } catch (error) {
      console.warn("Вызов Cloud Function закончился неудачей:", error);
      return await this.#fallback.createEventsReport(event);
    }
  }
}
