import EventEmitter, { once } from "node:events";
import { beforeEach, describe, expect, test } from "vitest";
import { Ping } from "../src";
import eventNames from "../src/events";

describe("ping", () => {
  let events: EventEmitter = new EventEmitter();
  let ping = new Ping({ events });

  beforeEach(() => {
    events = new EventEmitter();
    ping = new Ping({ events });
  });

  test("ping отвечает pong", async () => {
    const promise = once(events, eventNames.pong);
    events.emit(eventNames.ping);
    const [result] = await promise;
    expect(result).toEqual("pong");
  });
});
