import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { post } from "../../../api/tests/utils/fetch.js";
import urlJoin from "url-join";
import { UserActivityEvent } from "events/src/types.js";
import mock from "./mock.js";

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
    await Promise.all(
      mock
        .usersReportEvents()
        .map((e) => post(url("event"), { body: JSON.stringify(e) }))
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

  test("Отчет о зарегистрированных событиях активности пользователя должен работать", async () => {
    await Promise.all(
      mock
        .userReportEvents()
        .map((e) => post(url("event"), { body: JSON.stringify(e) }))
    );
    expect(
      await post(url("report", "user"), {
        body: JSON.stringify({
          userUUID: "f3e7a9b2-4c5d-6789-0123-456789abcdef",
          timeInterval: {
            start: "2025-01-13",
            end: "2025-01-26",
          },
        }),
      })
    ).toEqual({
      statusCode: 200,
      events: {
        click: { count: 1 },
        scroll: { count: 2 },
        form_submit: { count: 1 },
      },
    });
  });
});
