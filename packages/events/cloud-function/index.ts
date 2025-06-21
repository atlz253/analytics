import { Handler } from "@yandex-cloud/function-types";
import { initEvents } from "../src/index.js";
import { UserActivityEvent } from "../src/types.js";
import { tlsCAFile } from "../../shared/src/cloud-function/tlsCAFile.js";

export const handler: Handler.Http = async (event, context) => {
  const events = await initEvents({
    storage: {
      type: "mongo",
      host: "mongodb://user2:12345678@rc1b-uumhquflh32vru1k.mdb.yandexcloud.net:27018/",
      options: {
        tls: true,
        tlsCAFile: await tlsCAFile(),
        authSource: "events",
      },
    },
  });
  const body = event.body as never as UserActivityEvent;
  await events.createEvent({
    ...body,
    occurrenceTime: new Date(body.occurrenceTime),
  });
  return { statusCode: 200 };
};
