import { beforeEach, describe, expect, test } from "vitest";
import { Ping } from "../src";
import eventNames from "../src/events";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter";

describe("ping", () => {
  let events = new ImmutableEventEmitter();
  let ping = new Ping({ events });

  beforeEach(() => {
    events = new ImmutableEventEmitter();
    ping = new Ping({ events });
  });

  test("ping отвечает pong", async () => {
    const response = await events.request<string>(
      eventNames.ping,
      eventNames.pong
    );
    expect(response).toEqual("pong");
  });
});
