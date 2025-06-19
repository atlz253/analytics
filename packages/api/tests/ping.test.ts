import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { API } from "../src/index.js";
import { Ping } from "../../ping/src/index.js";
import { localhost } from "./utils/address.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { MockArchive } from "../../archive/src/index.js";

describe("/ping", () => {
  let events = new ImmutableEventEmitter();
  let api = new API({ events, archive: new MockArchive() });

  beforeEach(async () => {
    events = new ImmutableEventEmitter();
    api = new API({ events, archive: new MockArchive() });
    new Ping();
    await api.listen();
  });

  afterEach(async () => {
    await api.close();
  });

  test("возвращает pong", async () => {
    const response = await fetch(localhost(api.port) + "/ping");
    expect(await response.json()).toEqual({
      statusCode: 200,
      response: "pong",
    });
  });
});
