import { Handler } from "@yandex-cloud/function-types";
import { initEvents } from "../../events/src/index.js";
import { tlsCAFile } from "../../shared/src/cloud-function/tlsCAFile.js";
import { Archive, initArchive as archive } from "../src/index.js";
import { TimeInterval } from "../../shared/src/types/timeInterval.js";

const initArchive = async (): Promise<Archive> => {
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
  return archive({
    events,
    storage: {
      type: "YS3",
    },
  });
};

// FIXME: валидация входных данных в yandex functions
export const handler: Handler.Http = async (event, context) => {
  const archive = await initArchive();
  const uuid = await archive.createEventsArchive(
    event.body as unknown as { timeInterval: TimeInterval }
  );
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      statusCode: 200,
      archiveURL: `https://storage.yandexcloud.net/events-archives/events/${uuid}.zip`,
    }),
  };
};
