import { API } from "../../api/src/index.js";
import { Ping } from "../../ping/src/index.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { events as initEvents } from "../../events/src/index.js";
import { Report } from "../../report/src/index.js";
import { archive } from "../../archive/src/index.js";
import { StreamRegistry } from "../../shared/src/StreamRegistry.js";
import { Readable } from "node:stream";

(async () => {
  const events = new ImmutableEventEmitter();
  const readStreams = new StreamRegistry<Readable>();
  [Ping, Report].map((M) => new M({ events }));
  await archive({ events, readStreams, storage: { type: "mongo" } });
  await initEvents({ events, storage: { type: "mongo" } });

  const api = new API({ events, readStreams, logger: true, port: 3000 });
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
