import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { API } from "../src/index.js";
import { events as initEvents } from "../../events/src/index.js";
import { Archive } from "../../archive/src/index.js";
import urlJoin from "url-join";
import { localhost } from "./utils/address.js";
import fastify from "./utils/fastify.js";

describe("/archive", async () => {
  let events = new ImmutableEventEmitter();
  let api = new API({ events });
  let eventsModule = await initEvents({ events, storage: { type: "RAM" } });
  let archive = new Archive({ events });

  const url = (...parts: Array<string>) =>
    urlJoin(localhost(api.port), ...parts);

  beforeEach(async () => {
    events = new ImmutableEventEmitter();
    api = new API({ events });
    eventsModule = await initEvents({ events, storage: { type: "RAM" } });
    archive = new Archive({ events });
    await api.listen();
  });

  afterEach(async () => {
    await api.close();
  });

  test("/events должен возвращать ошибку при пустом теле запроса", async () => {
    expect(
      await (await fetch(url("archive", "events"), { method: "POST" })).json()
    ).toEqual(fastify.errors.bodyMustBeObject);
  });
});
