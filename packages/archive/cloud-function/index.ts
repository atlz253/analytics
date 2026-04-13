import { initEvents } from "@atlz253/events";
import { tlsCAFile } from "@atlz253/shared/cloud-function/tlsCAFile";
import { TimeInterval } from "@atlz253/shared/types/timeInterval";
import { Handler } from "@yandex-cloud/function-types";
import { SQS } from "aws-sdk";

import { AbstractArchive, initArchive as archive } from "../src/index.js";

interface ArchiveInfo {
  archiveRequest: { timeInterval: TimeInterval };
}

const initArchive = async (): Promise<AbstractArchive> => {
  const events = await initEvents({
    // FIXME: исправить
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
  return archive({
    dependencies: { events },
    storage: {
      type: "YS3",
      region: process.env.ARCHIVE_STORAGE_YS3_REGION!,
      bucketName: process.env.ARCHIVE_STORAGE_YS3_BUCKET_NAME!,
      credentials: {
        accessKeyId: process.env.ARCHIVE_STORAGE_YS3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.ARCHIVE_STORAGE_YS3_SECRET_ACCESS_KEY!,
      },
    },
  });
};

// FIXME: валидация входных данных в yandex functions
export const handler: Handler.Http = async (event) => {
  const archive = await initArchive();
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
      const archiveInfo = JSON.parse(message.body) as ArchiveInfo;
      const correlationId =
        message.message_attributes["correlationId"].string_value;

      const uuid = await archive.createEventsArchive(
        archiveInfo.archiveRequest,
      );
      const result = {
        statusCode: 200,
        archiveURL: `https://storage.yandexcloud.net/${process.env.ARCHIVE_STORAGE_YS3_BUCKET_NAME!}/events/${uuid}.zip`,
      };
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

  return {
    statusCode: 200,
  };
};
