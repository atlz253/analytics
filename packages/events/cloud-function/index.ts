import { Handler } from "@yandex-cloud/function-types";
import { initEvents } from "../src/index.js";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UserActivityEvent } from "../src/types.js";

export const handler: Handler.Http = async (event, context) => {
  const url = "https://storage.yandexcloud.net/cloud-certs/CA.pem";
  const tlsCAFile = join(tmpdir(), "CA.pem");
  const response = await fetch(url);
  const data = await response.text();
  writeFileSync(tlsCAFile, data);

  const events = await initEvents({
    storage: {
      type: "mongo",
      host: "mongodb://user2:12345678@rc1b-uumhquflh32vru1k.mdb.yandexcloud.net:27018/",
      options: {
        tls: true,
        tlsCAFile: tlsCAFile,
        authSource: "db1",
      },
    },
  });
  await events.createEvent(event.body as never as UserActivityEvent);
  return { statusCode: 200 };
};
