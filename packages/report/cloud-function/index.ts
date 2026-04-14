import { initEvents } from "@atlz253/events";
import { tlsCAFile } from "@atlz253/shared/cloud-function/tlsCAFile";
import { TimeInterval } from "@atlz253/shared/types/timeInterval";
import { Handler } from "@yandex-cloud/function-types";
import { SQS } from "aws-sdk";

import { Report } from "../src/index.js";

const initReport = async (): Promise<Report> => {
  const events = await initEvents({
    storage: {
      type: "mongo",
      user: process.env.MONGO_USER ?? "",
      password: process.env.MONGO_PASSWORD ?? "",
      hosts: process.env.MONGO_HOSTS ?? "",
      options: {
        tls: true,
        tlsCAFile: await tlsCAFile(),
        authSource: "events",
      },
    },
  });
  return new Report({ dependencies: { events } });
};

interface EventInfo {
  reportType: "users" | "user" | "eventTypes" | "events";
  event: unknown;
}

const handleEventInfo = async (eventInfo: EventInfo) => {
  const report = await initReport();
  switch (eventInfo.reportType) {
    case "users":
      return report.createUsersReport(
        eventInfo.event as { timeInterval: TimeInterval },
      );
    case "user":
      return report.createUserReport(
        eventInfo.event as { userUUID: string; timeInterval: TimeInterval },
      );
    case "events":
      return report.createEventsReport(
        eventInfo.event as { timeInterval: TimeInterval },
      );
    case "eventTypes":
      return report.createEventTypesReport(
        eventInfo.event as { timeInterval: TimeInterval },
      );
  }
};

export const handler: Handler.Http = async (event) => {
  const responseQueue = new SQS({
    region: "ru-central1",
    endpoint: "https://message-queue.api.cloud.yandex.net",
    credentials: {
      accessKeyId: process.env.QUEUE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.QUEUE_SECRET_ACCESS_KEY ?? "",
    },
  });
  const messages: Array<{
    details: {
      message: {
        body: string;
        message_attributes: Record<
          string,
          { data_type: string; string_value: string }
        >;
      };
    };
    // @ts-expect-error Сообщения точно есть
  }> = event.messages ?? [];

  await Promise.all(
    messages.map(async (item) => {
      const message = item.details.message;
      const eventInfo = JSON.parse(message.body) as EventInfo;
      const correlationId =
        message.message_attributes["correlationId"].string_value;
      const result = await handleEventInfo(eventInfo);

      await responseQueue
        .sendMessage({
          QueueUrl: process.env.QUEUE_RESPONSE_URL ?? "",
          MessageBody: JSON.stringify(result),
          MessageAttributes: {
            correlationId: {
              DataType: "String",
              StringValue: correlationId,
            },
          },
        })
        .promise();
    }),
  );

  return { statusCode: 200 };
};
