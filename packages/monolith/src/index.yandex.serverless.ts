import { API } from "../../api/src/index.js";
import { AbstractEvents } from "../../events/src/index.js";
import { AbstractReport } from "../../report/src/index.js";
import { initArchive } from "../../archive/src/index.js";
import { Builder } from "@atlz253/frontier";
import developConfig from "../config/frontier/develop.js";
import yandexConfig from "../config/frontier/yandex.js";
import serverlessYandexConfig from "../config/frontier/yandex.serverless.js";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { cwd } from "node:process";

(async () => {
  dotenv.config({
    path: [".env.yandex.serverless", ".env.yandex", ".env"].map((f) =>
      resolve(cwd(), f)
    ),
  });
  const modules = await new Builder().build(
    ...(await Promise.all([
      developConfig(),
      yandexConfig(),
      serverlessYandexConfig(),
    ]))
  );
  const events = modules["events"] as AbstractEvents;
  const report = modules["report"] as AbstractReport;
  const archive = await initArchive({
    events,
    storage: {
      type: "YS3",
    },
    cloudFunction: true,
  });
  const api = new API({
    events,
    archive: {
      module: archive,
      archiveURL: ({ uuid }) =>
        `https://storage.yandexcloud.net/events-archives/events/${uuid}.zip`,
    },
    report,
    logger: true,
    port: 3000,
  });
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
