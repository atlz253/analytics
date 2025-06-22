import { API } from "../../api/src/index.js";
import { initEvents } from "../../events/src/index.js";
import { CloudFunctionReport, Report } from "../../report/src/index.js";
import { initArchive } from "../../archive/src/index.js";
import { tlsCAFile } from "../../shared/src/cloud-function/tlsCAFile.js";

(async () => {
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
  const report = new CloudFunctionReport({ fallback: new Report({ events }) });
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
