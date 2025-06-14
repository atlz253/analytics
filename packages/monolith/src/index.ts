import EventEmitter from "node:events";
import { API } from "../../api/src/index.js";
import { Ping } from "../../ping/src/index.js";

const events = new EventEmitter();
const api = new API({ events, logger: true });
new Ping({ events });

await api.listen();
console.log(`API доступен по адресу: http://localhost:${api.port}`);
