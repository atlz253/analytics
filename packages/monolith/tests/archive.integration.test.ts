import { afterAll, beforeEach, describe, expect, test } from "vitest";
import urlJoin from "url-join";
import { post } from "../../api/tests/utils/fetch.js";
import { UserActivityEvent } from "events/src/types.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { downloadFile } from "../../shared/src/tests/downloadFile.js";
import AdmZip from "adm-zip";
import { omit } from "ramda";
import { unlink } from "node:fs/promises";

describe("Создание архивов", async () => {
  const url = (...parts: string[]) =>
    urlJoin("http://localhost:3000", ...parts);

  const createUserEvents = async (events: UserActivityEvent[]) =>
    expect(
      await post(url("event", "create_multiple"), {
        body: JSON.stringify(events),
      })
    ).toEqual({ statusCode: 200 });

  beforeEach(async () => {
    await post(url("event/drop_database"), { body: JSON.stringify({}) });
  });

  afterAll(async () => {
    await post(url("event/drop_database"), { body: JSON.stringify({}) });
  });

  test("Должен формироваться архив с пользовательскими событиями", async () => {
    await createUserEvents([
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-01-12T14:17:28.456Z"),
        type: "scroll",
        userUUID: "32bbd564-55b9-4ef4-ace4-da91b57b3c3a",
        page: "news",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-01-27T11:52:39.789Z"),
        type: "hover",
        userUUID: "32bbd564-55b9-4ef4-ace4-da91b57b3c3a",
        page: "events",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-02-05T08:43:15.123Z"),
        type: "click",
        userUUID: "32bbd564-55b9-4ef4-ace4-da91b57b3c3a",
        page: "courses",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-02-18T19:26:47.567Z"),
        type: "page_view",
        userUUID: "32bbd564-55b9-4ef4-ace4-da91b57b3c3a",
        page: "library",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-03-08T16:14:52.890Z"),
        type: "double_click",
        userUUID: "32bbd564-55b9-4ef4-ace4-da91b57b3c3a",
        page: "videos",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-03-22T07:39:21.234Z"),
        type: "key_press",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "forum",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-04-11T13:58:06.678Z"),
        type: "form_submit",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "registration",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-04-25T20:12:33.012Z"),
        type: "focus",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "webinars",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-05-14T10:27:48.345Z"),
        type: "blur",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "webinars",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-05-29T15:45:19.789Z"),
        type: "resize",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "tutorials",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-06-03T12:18:54.123Z"),
        type: "scroll",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "community",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-06-17T09:07:41.456Z"),
        type: "hover",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "marketplace",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-07-02T18:34:27.890Z"),
        type: "click",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "analytics",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-07-19T14:51:03.234Z"),
        type: "page_view",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "reports",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-08-06T06:23:16.567Z"),
        type: "double_click",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "calendar",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-08-21T22:49:38.901Z"),
        type: "key_press",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "notes",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-09-12T17:35:52.345Z"),
        type: "form_submit",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "feedback",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-09-28T11:08:14.678Z"),
        type: "focus",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "tools",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-10-15T04:42:29.012Z"),
        type: "resize",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "workspace",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-10-30T21:57:45.456Z"),
        type: "scroll",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "archive",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-11-14T16:21:07.789Z"),
        type: "hover",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "templates",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-12-05T13:46:58.123Z"),
        type: "click",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "integrations",
      },
    ] as Array<UserActivityEvent>);
    const response = await post(url("archive", "events"), {
      body: JSON.stringify({
        timeInterval: { start: "2024-04-01", end: "2024-12-01" },
      }),
    });
    expect(response.statusCode).toBe(200);
    expect(() => new URL(response.archiveURL)).not.toThrowError("Invalid URL");
    const zipPath = join(tmpdir(), "test.integration.archive.events.zip");
    await downloadFile(response.archiveURL, zipPath);
    const zip = new AdmZip(zipPath);
    const eventsFile = zip
      .getEntries()
      .find((e) => e.entryName === "events.json");
    const readEvents = JSON.parse(
      eventsFile?.getData().toString("utf-8") || ""
    );
    if (!Array.isArray(readEvents))
      throw new Error("Прочитанные данные не являются массивом");
    expect(
      readEvents.map((e) =>
        typeof e === "object" && e !== null
          ? omit(["createTime", "_id"], {
              ...e,
              occurrenceTime: new Date(e.occurrenceTime),
            })
          : e
      )
    ).toEqual([
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-04-11T13:58:06.678Z"),
        type: "form_submit",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "registration",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-04-25T20:12:33.012Z"),
        type: "focus",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "webinars",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-05-14T10:27:48.345Z"),
        type: "blur",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "webinars",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-05-29T15:45:19.789Z"),
        type: "resize",
        userUUID: "2ee2f718-df8d-4937-ba7c-4dcf79f0e141",
        page: "tutorials",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-06-03T12:18:54.123Z"),
        type: "scroll",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "community",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-06-17T09:07:41.456Z"),
        type: "hover",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "marketplace",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-07-02T18:34:27.890Z"),
        type: "click",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "analytics",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-07-19T14:51:03.234Z"),
        type: "page_view",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "reports",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-08-06T06:23:16.567Z"),
        type: "double_click",
        userUUID: "d3ab378b-aec5-4154-a752-4355b2f00ce5",
        page: "calendar",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-08-21T22:49:38.901Z"),
        type: "key_press",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "notes",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-09-12T17:35:52.345Z"),
        type: "form_submit",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "feedback",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-09-28T11:08:14.678Z"),
        type: "focus",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "tools",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-10-15T04:42:29.012Z"),
        type: "resize",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "workspace",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-10-30T21:57:45.456Z"),
        type: "scroll",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "archive",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-11-14T16:21:07.789Z"),
        type: "hover",
        userUUID: "f399ed5c-4e75-4945-af7a-fd9188ab91c9",
        page: "templates",
      },
    ]);
    await unlink(zipPath);
  });
});
