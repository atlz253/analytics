import { API } from "../../api/src/index.js";
import { Ping } from "../../ping/src/index.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { events as initEvents } from "../../events/src/index.js";
import { Report } from "../../report/src/index.js";
import { archive as initArchive } from "../../archive/src/index.js";

(async () => {
  const events = new ImmutableEventEmitter();
  [Ping, Report].map((M) => new M({ events }));
  const archive = await initArchive({ events, storage: { type: "mongo" } });
  await initEvents({ events, storage: { type: "mongo" } });

  const api = new API({ events, archive, logger: true, port: 3000 });
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
