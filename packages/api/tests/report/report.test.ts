import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { API } from "../../src/index.js";
import { Report } from "../../../report/src/index.js";
import { localhost } from "../utils/address.js";
import urlJoin from "url-join";
import fastify from "../utils/fastify.js";
import { initEvents as initEvents } from "../../../events/src/index.js";
import { post } from "../utils/fetch.js";
import mock from "./mock.js";
import { omit } from "ramda";
import { ArchiveMock } from "../../../archive/src/index.js";

describe("/report", async () => {
  let events = await initEvents({ storage: { type: "RAM" } });
  let report = new Report({ events });
  let api = new API({ events, report, archive: { module: new ArchiveMock() } });

  const url = (...parts: string[]) =>
    urlJoin(localhost(api.port), "/report", ...parts);

  const reportsURL = () => [
    url("users"),
    url("user"),
    url("eventTypes"),
    url("events"),
  ];

  beforeEach(async () => {
    events = await initEvents({ storage: { type: "RAM" } });
    report = new Report({ events });
    api = new API({ events, report, archive: { module: new ArchiveMock() } });
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
      expect(r.code).toEqual("FST_ERR_VALIDATION")
    );
  });

  test("/users возвращает список пользователей с зарегистрированными событиями", async () => {
    await events.createEvents([
      {
        eventType: "userActivity",
        userUUID: "57ee3021-b856-4dc6-8af3-2310ab047256",
        type: "load",
        occurrenceTime: new Date("2025-06-17T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "32c2b348-6882-4224-92c2-13faf09080bd",
        type: "load",
        occurrenceTime: new Date("2025-05-15T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "load",
        occurrenceTime: new Date("2024-03-20T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "click",
        occurrenceTime: new Date("2024-03-20T11:27:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "click",
        occurrenceTime: new Date("2024-03-20T11:29:21.865Z"),
        page: "test",
      },
    ]);
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

  test("/user должен возвращать данные о зарегистрированных событиях активности пользователя", async () => {
    await events.createEvents([
      {
        eventType: "userActivity",
        userUUID: "57ee3021-b856-4dc6-8af3-2310ab047256",
        type: "load",
        occurrenceTime: new Date("2023-06-17T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "32c2b348-6882-4224-92c2-13faf09080bd",
        type: "load",
        occurrenceTime: new Date("2023-05-15T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "load",
        occurrenceTime: new Date("2023-03-20T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "click",
        occurrenceTime: new Date("2022-03-20T11:27:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "click",
        occurrenceTime: new Date("2022-03-20T11:29:21.865Z"),
        page: "test",
      },
    ]);
    const response = await post(url("/user"), {
      body: JSON.stringify({
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        timeInterval: { start: "2022-03-20" },
      }),
    });
    expect(response).toEqual({
      statusCode: 200,
      events: {
        load: {
          count: 1,
        },
        click: {
          count: 2,
        },
      },
    });
  });

  test("/eventTypes должен возвращать информацию о зарегистрированных событиях в системе", async () => {
    await events.createEvents([
      {
        eventType: "userActivity",
        userUUID: "57ee3021-b856-4dc6-8af3-2310ab047256",
        type: "load",
        occurrenceTime: new Date("2023-06-17T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "32c2b348-6882-4224-92c2-13faf09080bd",
        type: "load",
        occurrenceTime: new Date("2023-05-15T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "load",
        occurrenceTime: new Date("2022-03-19T11:26:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "click",
        occurrenceTime: new Date("2022-03-20T11:27:21.865Z"),
        page: "test",
      },
      {
        eventType: "userActivity",
        userUUID: "a8636665-83c7-4537-b81c-a6e10d976f56",
        type: "click",
        occurrenceTime: new Date("2022-03-20T11:29:21.865Z"),
        page: "test",
      },
    ]);
    const response = await post(url("/eventTypes"), {
      body: JSON.stringify({
        timeInterval: {
          start: "2022-03-20",
        },
      }),
    });
    expect(response).toEqual({
      statusCode: 200,
      events: {
        load: { count: 2 },
        click: { count: 2 },
      },
    });
  });

  test("/events должен отправлять события за определенный промежуток времени", async () => {
    await events.createEvents(mock.eventsReportEvents());
    const response = await post(url("/events"), {
      body: JSON.stringify({
        timeInterval: {
          start: "2024-03-01",
          end: "2024-07-01",
        },
      }),
    });
    response.events = response.events.map((e: { createTime: string }) =>
      omit(["createTime"], e)
    );
    expect(response).toEqual({
      statusCode: 200,
      events: [
        {
          eventType: "userActivity",
          occurrenceTime: "2024-03-12T11:35:29.567Z",
          type: "click",
          userUUID: "c3d4e5f6-7890-1234-5678-901234567cde",
          page: "product-details",
        },
        {
          eventType: "userActivity",
          occurrenceTime: "2024-03-25T08:51:47.890Z",
          type: "form_submit",
          userUUID: "b2c3d4e5-6f70-8901-2345-678901234bcd",
          page: "contact",
        },
        {
          eventType: "userActivity",
          occurrenceTime: "2024-04-03T18:26:15.123Z",
          type: "page_view",
          userUUID: "d4e5f6a7-8901-2345-6789-012345678def",
          page: "about",
        },
        {
          eventType: "userActivity",
          occurrenceTime: "2024-04-18T13:07:52.456Z",
          type: "page_view",
          userUUID: "a1b2c3d4-5e6f-7890-1234-567890123abc",
          page: "dashboard",
        },
        {
          eventType: "userActivity",
          occurrenceTime: "2024-05-07T10:44:38.789Z",
          type: "key_press",
          userUUID: "c3d4e5f6-7890-1234-5678-901234567cde",
          page: "search",
        },
        {
          eventType: "userActivity",
          occurrenceTime: "2024-05-22T15:19:26.012Z",
          type: "scroll",
          userUUID: "b2c3d4e5-6f70-8901-2345-678901234bcd",
          page: "blog",
        },
        {
          eventType: "userActivity",
          occurrenceTime: "2024-06-14T07:33:41.345Z",
          type: "focus",
          userUUID: "e5f6a7b8-9012-3456-7890-123456789efa",
          page: "login",
        },
        {
          eventType: "userActivity",
          occurrenceTime: "2024-06-14T07:35:09.678Z",
          type: "blur",
          userUUID: "e5f6a7b8-9012-3456-7890-123456789efa",
          page: "login",
        },
      ],
    });
  });
});
