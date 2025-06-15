import { API } from "../../api/src/index.js";
import { Ping } from "../../ping/src/index.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { events as initEvents } from "../../events/src/index.js";

const events = new ImmutableEventEmitter();
const api = new API({ events, logger: true, port: 3000 });
new Ping({ events });
initEvents({ events, storage: "mongo" });

api
  .listen()
  .then(() =>
    console.log(`API доступен по адресу: http://localhost:${api.port}`)
  );
