import { API } from "../../api/src/index.js";
import { initEvents } from "../../events/src/index.js";
import { Report } from "../../report/src/index.js";
import { initArchive } from "../../archive/src/index.js";

(async () => {
  const events = await initEvents({ storage: { type: "mongo" } });
  const report = new Report({ events });
  const archive = await initArchive({ events, storage: { type: "mongo" } });
  const api = new API({ events, archive, report, logger: true, port: 3000 });
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
