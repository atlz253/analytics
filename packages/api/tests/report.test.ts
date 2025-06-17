import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { API } from "../src/index.js";
import { Report } from "../../report/src/index.js";
import { localhost } from "./utils/address.js";
import urlJoin from "url-join";
import fastify from "./utils/fastify.js";
import { events as initEvents } from "../../events/src/index.js";
import { post } from "./utils/fetch.js";
import eventsEventNames from "../../events/src/events.js";
import { UserActivityEvent } from "events/src/types.js";

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

  test("/users возвращает список пользователей с зарегистрированными событиями", async () => {
    await events.request<[Array<UserActivityEvent>]>(
      eventsEventNames.createMultiple,
      eventsEventNames.createMultipleAfter,
      [
        {
          eventType: "userActivity",
          userUUID: "57ee3021-b856-4dc6-8af3-2310ab047256",
          type: "load",
          occurrenceTime: "2025-06-17T11:26:21.865Z",
          page: "test",
        },
        {
          eventType: "userActivity",
          userUUID: "32c2b348-6882-4224-92c2-13faf09080bd",
          type: "load",
          occurrenceTime: "2025-05-15T11:26:21.865Z",
          page: "test",
        },
        {
          eventType: "userActivity",
          userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
          type: "load",
          occurrenceTime: "2024-03-20T11:26:21.865Z",
          page: "test",
        },
        {
          eventType: "userActivity",
          userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
          type: "click",
          occurrenceTime: "2024-03-20T11:27:21.865Z",
          page: "test",
        },
        {
          eventType: "userActivity",
          userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
          type: "click",
          occurrenceTime: "2024-03-20T11:29:21.865Z",
          page: "test",
        },
      ]
    );
    const response = await post(url("/users"), {
      body: JSON.stringify({
        timeInterval: { start: "2024-03-20" },
      }),
    });
    expect(response).toEqual({
      statusCode: 200,
      users: {
        "57ee3021-b856-4dc6-8af3-2310ab047256": { eventsCount: 1 },
        "32c2b348-6882-4224-92c2-13faf09080bd": { eventsCount: 1 },
        "a8636665-83c7-4537-b81c-a6e10d976f56": { eventsCount: 3 },
      },
    });
  });
});
