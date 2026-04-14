import { tlsCAFile } from "@atlz253/shared/cloud-function/tlsCAFile";
import { Handler } from "@yandex-cloud/function-types";
import { SQS } from "aws-sdk";

import { initEvents } from "../src/index.js";
import { UserActivityEvent } from "../src/types.js";

export const handler: Handler.Http = async (event) => {
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
      const body = JSON.parse(message.body) as UserActivityEvent;
      const correlationId =
        message.message_attributes["correlationId"].string_value;
      await events.createEvent({
        ...body,
        occurrenceTime: new Date(body.occurrenceTime),
      });

      await responseQueue
        .sendMessage({
          QueueUrl: process.env.QUEUE_RESPONSE_URL ?? "",
          MessageBody: JSON.stringify({ statusCode: 200 }),
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
