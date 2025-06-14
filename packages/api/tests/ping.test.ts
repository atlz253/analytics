import EventEmitter from "node:events";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { API } from "../src";
import { Ping } from "../../ping/src";

describe("API", () => {
  let events = new EventEmitter();
  let api = new API({ events });

  beforeEach(async () => {
    events = new EventEmitter();
    api = new API({ events });
    await api.listen();
  });

  afterEach(async () => {
    await api.close();
  });

  test("/ping работает", async () => {
    new Ping({ events });
    const response = await fetch("http://localhost:3000/ping");
    expect(await response.json()).toEqual({ response: "pong" });
  });
});
