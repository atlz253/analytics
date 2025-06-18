import { API } from "../../api/src/index.js";
import { Ping } from "../../ping/src/index.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { events as initEvents } from "../../events/src/index.js";
import { Report } from "../../report/src/index.js";

(async () => {
  const events = new ImmutableEventEmitter();
  new Ping({ events });
  new Report({ events });
  await initEvents({ events, storage: { type: "mongo" } });

  const api = new API({ events, logger: true, port: 3000 });
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
