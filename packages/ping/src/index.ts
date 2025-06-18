import pingEvents from "./events.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";

export class Ping {
  constructor({ events }: { events: ImmutableEventEmitter }) {
    events.on(pingEvents.ping, (event) =>
      events.emit(pingEvents.pong, { ...event, response: "pong" })
    );
  }
}
