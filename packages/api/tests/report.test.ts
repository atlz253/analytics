import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { API } from "../src/index.js";
import { Report } from "../../report/src/index.js";
import { localhost } from "./utils/address.js";
import urlJoin from "url-join";
import fastify from "./utils/fastify.js";
import { events as initEvents } from "../../events/src/index.js";

describe("/report", async () => {
  let events = new ImmutableEventEmitter();
  let api = new API({ events });
  let report = new Report({ events });
  let eventsModule = await initEvents({ events, storage: "RAM" });

  const url = (...parts: string[]) =>
    urlJoin(localhost(api.port), "/report", ...parts);

  beforeEach(async () => {
    events = new ImmutableEventEmitter();
    api = new API({ events });
    report = new Report({ events });
    eventsModule = await initEvents({ events, storage: "RAM" });
    await api.listen();
  });

  afterEach(async () => {
    await api.close();
  });

  test("/users должен выбрасывать ошибку при пустом теле запроса", async () => {
    const responses = await Promise.all(
      [
        url("users"),
        url("user"),
        url("eventTypes"),
        url("eventAverageTime"),
      ].map(() => fetch(url("users"), { method: "POST" }).then((r) => r.json()))
    );
    responses.forEach((r) =>
      expect(r).toEqual(fastify.errors.bodyMustBeObject)
    );
  });
});
