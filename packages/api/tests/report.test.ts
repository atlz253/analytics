import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { API } from "../src/index.js";
import { Report } from "../../report/src/index.js";
import { localhost } from "./utils/address.js";
import urlJoin from "url-join";
import fastify from "./utils/fastify.js";
import { events as initEvents } from "../../events/src/index.js";
import { post } from "./utils/fetch.js";

describe("/report", async () => {
  let events = new ImmutableEventEmitter();
  let api = new API({ events });
  let report = new Report({ events });
  let eventsModule = await initEvents({ events, storage: { type: "RAM" } });

  const url = (...parts: string[]) =>
    urlJoin(localhost(api.port), "/report", ...parts);

  const reportsURL = () => [
    url("users"),
    url("user"),
    url("eventTypes"),
    url("eventAverageTime"),
  ];

  beforeEach(async () => {
    events = new ImmutableEventEmitter();
    api = new API({ events });
    report = new Report({ events });
    eventsModule = await initEvents({ events, storage: { type: "RAM" } });
    await api.listen();
  });

  afterEach(async () => {
    await api.close();
  });

  test("endpoint должен выбрасывать ошибку при пустом теле запроса", async () => {
    const responses = await Promise.all(
      reportsURL().map((r) =>
        fetch(r, { method: "POST" }).then((r) => r.json())
      )
    );
    responses.forEach((r) =>
      expect(r).toEqual(fastify.errors.bodyMustBeObject)
    );
  });

  test("endpoint должен возвращать ошибку при отсутствии обязательных полей", async () => {
    const withoutTimeInterval = Promise.all(
      reportsURL().map((r) => post(r, { body: JSON.stringify({}) }))
    );
    const withoutStartDate = Promise.all(
      reportsURL().map((r) =>
        post(r, {
          body: JSON.stringify({
            timeInterval: {},
          }),
        })
      )
    );

    (await withoutTimeInterval).forEach((r) =>
      expect(r).toEqual(
        fastify.errors.bodyMustHaveRequiredProperty("timeInterval")
      )
    );

    (await withoutStartDate).forEach((r) =>
      expect(r).toEqual({
        code: "FST_ERR_VALIDATION",
        error: "Bad Request",
        message: "body/timeInterval must have required property 'start'",
        statusCode: 400,
      })
    );
  });
});
