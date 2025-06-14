import EventEmitter from "node:events";
import pingEvents from "./events";

export class Ping {
  constructor({ events }: { events: EventEmitter }) {
    events.on(pingEvents.ping, () => events.emit(pingEvents.pong, "pong"));
  }
}
