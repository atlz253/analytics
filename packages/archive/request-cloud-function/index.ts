import { randomUUID } from "node:crypto";

import { Handler } from "@yandex-cloud/function-types";
import { SQS } from "aws-sdk";

export const handler: Handler.Http = async (event) => {
  const queue = new SQS({
    region: "ru-central1",
    endpoint: "https://message-queue.api.cloud.yandex.net",
    credentials: {
      accessKeyId: process.env.QUEUE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.QUEUE_SECRET_ACCESS_KEY ?? "",
    },
  });
  const correlationId = randomUUID();

  await queue
    .sendMessage({
      QueueUrl: process.env.REQUEST_QUEUE_URL ?? "",
      MessageBody: JSON.stringify({ archiveRequest: JSON.parse(event.body) }),
      MessageAttributes: {
        correlationId: {
          DataType: "String",
          StringValue: correlationId,
        },
        replyQueueUrl: {
          DataType: "String",
          StringValue: process.env.RESPONSE_QUEUE_URL ?? "",
        },
      },
    })
    .promise();

  while (true) {
    const res = await queue
      .receiveMessage({
        QueueUrl: process.env.RESPONSE_QUEUE_URL ?? "",
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All"],
      })
      .promise();

    for (const msg of res.Messages || []) {
      const replyCorrelationId =
        msg.MessageAttributes?.correlationId?.StringValue;

      if (replyCorrelationId === correlationId) {
        await queue
          .deleteMessage({
            QueueUrl: process.env.RESPONSE_QUEUE_URL ?? "",
            ReceiptHandle: msg.ReceiptHandle!,
          })
          .promise();

        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: msg.Body!,
        };
      }
    }
  }
};
