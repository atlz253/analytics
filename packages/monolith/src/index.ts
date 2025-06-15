import { API } from "../../api/src/index.js";
import { Ping } from "../../ping/src/index.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";

const events = new ImmutableEventEmitter();
const api = new API({ events, logger: true });
new Ping({ events });

api
  .listen()
  .then(() =>
    console.log(`API доступен по адресу: http://localhost:${api.port}`)
  );
