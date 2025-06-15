import pingEvents from "./events";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter";

export class Ping {
  constructor({ events }: { events: ImmutableEventEmitter }) {
    events.on(pingEvents.ping, (event) =>
      events.emit(pingEvents.pong, { ...event, response: "pong" })
    );
  }
}
