import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { post } from "../../api/tests/utils/fetch.js";
import urlJoin from "url-join";
import { UserActivityEvent } from "events/src/types.js";

describe("Создание отчетов", async () => {
  const url = (...parts: string[]) =>
    urlJoin("http://localhost:3000", ...parts);

  beforeEach(async () => {
    await post(url("event/drop_database"), { body: JSON.stringify({}) });
  });

  afterAll(async () => {
    await post(url("event/drop_database"), { body: JSON.stringify({}) });
  });

  test("Отчет о количестве зарегистрированных событий пользователями должен работать", async () => {
    const userEvents: Array<UserActivityEvent> = [
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2025-01-15T09:23:45.123Z"),
        type: "click",
        userUUID: "a7b4c8d9-1e2f-4567-8901-234567890abc",
        page: "index",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2025-02-28T15:47:12.987Z"),
        type: "scroll",
        userUUID: "b8c5d9e0-2f3a-5678-9012-345678901bcd",
        page: "catalog",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-12-03T22:15:33.456Z"),
        type: "hover",
        userUUID: "c9d6e0f1-3a4b-6789-0123-456789012cde",
        page: "product-details",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2025-03-10T06:41:08.789Z"),
        type: "form_submit",
        userUUID: "d0e7f1a2-4b5c-7890-1234-567890123def",
        page: "contact",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-11-20T18:29:55.321Z"),
        type: "page_view",
        userUUID: "e1f8a2b3-5c6d-8901-2345-678901234efa",
        page: "about",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2025-04-07T12:03:17.654Z"),
        type: "double_click",
        userUUID: "f2a9b3c4-6d7e-9012-3456-789012345fab",
        page: "dashboard",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-10-14T03:56:42.147Z"),
        type: "key_press",
        userUUID: "a3b0c4d5-7e8f-0123-4567-890123456abc",
        page: "search",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2025-05-22T21:18:29.852Z"),
        type: "resize",
        userUUID: "b4c1d5e6-8f90-1234-5678-901234567bcd",
        page: "profile",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-09-08T14:35:06.963Z"),
        type: "focus",
        userUUID: "c9d6e0f1-3a4b-6789-0123-456789012cde",
        page: "settings",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2025-06-17T11:52:38.741Z"),
        type: "blur",
        userUUID: "e1f8a2b3-5c6d-8901-2345-678901234efa",
        page: "checkout",
      },
    ];
    await Promise.all(
      userEvents.map((e) => post(url("event"), { body: JSON.stringify(e) }))
    );
    expect(
      await post(url("report", "users"), {
        body: JSON.stringify({ timeInterval: { start: "2024-09-08" } }),
      })
    ).toEqual({
      statusCode: 200,
      users: {
        "a7b4c8d9-1e2f-4567-8901-234567890abc": { eventsCount: 1 },
        "b8c5d9e0-2f3a-5678-9012-345678901bcd": { eventsCount: 1 },
        "c9d6e0f1-3a4b-6789-0123-456789012cde": { eventsCount: 2 },
        "d0e7f1a2-4b5c-7890-1234-567890123def": { eventsCount: 1 },
        "e1f8a2b3-5c6d-8901-2345-678901234efa": { eventsCount: 2 },
        "f2a9b3c4-6d7e-9012-3456-789012345fab": { eventsCount: 1 },
        "a3b0c4d5-7e8f-0123-4567-890123456abc": { eventsCount: 1 },
        "b4c1d5e6-8f90-1234-5678-901234567bcd": { eventsCount: 1 },
      },
    });
    expect(
      await post(url("report", "users"), {
        body: JSON.stringify({
          timeInterval: { start: "2024-09-08", end: "2024-12-04" },
        }),
      })
    ).toEqual({
      statusCode: 200,
      users: {
        "c9d6e0f1-3a4b-6789-0123-456789012cde": { eventsCount: 2 },
        "e1f8a2b3-5c6d-8901-2345-678901234efa": { eventsCount: 1 },
        "a3b0c4d5-7e8f-0123-4567-890123456abc": { eventsCount: 1 },
      },
    });
  });
});
