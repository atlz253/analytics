import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { API } from "../src";
import { Ping } from "../../ping/src";
import { localhost } from "./utils/address";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter";

describe("/ping", () => {
  let events = new ImmutableEventEmitter();
  let api = new API({ events });

  beforeEach(async () => {
    events = new ImmutableEventEmitter();
    api = new API({ events });
    new Ping({ events });
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
