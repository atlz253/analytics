import { tlsCAFile } from "@atlz253/shared/cloud-function/tlsCAFile";
import { Handler } from "@yandex-cloud/function-types";

import { initEvents } from "../src/index.js";
import { UserActivityEvent } from "../src/types.js";

export const handler: Handler.Http = async (event) => {
  const events = await initEvents({ // FIXME: исправить
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
  const body = JSON.parse(event.body) as UserActivityEvent;
  await events.createEvent({
    ...body,
    occurrenceTime: new Date(body.occurrenceTime),
  });
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ statusCode: 200 }),
  };
};
