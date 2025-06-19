import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import { API } from "../src/index.js";
import { events as initEvents } from "../../events/src/index.js";
import { archive as initArchive } from "../../archive/src/index.js";
import urlJoin from "url-join";
import { localhost } from "./utils/address.js";
import fastify from "./utils/fastify.js";
import eventsEventNames from "../../events/src/events.js";
import { UserActivityEvent } from "events/src/types.js";
import { post } from "./utils/fetch.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { omit } from "ramda";
import { StreamRegistry } from "../../shared/src/StreamRegistry.js";
import { ReadStream } from "node:fs";
import { downloadFile } from "../../shared/src/tests/downloadFile.js";
import { unlink } from "node:fs/promises";

describe("/archive", async () => {
  let events = new ImmutableEventEmitter();
  let readStreams = new StreamRegistry<ReadStream>();
  let eventsModule = await initEvents({ events, storage: { type: "RAM" } });
  let archive = await initArchive({
    events,
    storage: { type: "RAM" },
  });
  let api = new API({ events, archive });

  const url = (...parts: Array<string>) =>
    urlJoin(localhost(api.port), "archive", ...parts);

  beforeEach(async () => {
    events = new ImmutableEventEmitter();
    readStreams = new StreamRegistry<ReadStream>();
    eventsModule = await initEvents({ events, storage: { type: "RAM" } });
    archive = await initArchive({
      events,
      storage: { type: "RAM" },
    });
    api = new API({ events, archive });
    await api.listen();
  });

  afterEach(async () => {
    await api.close();
  });

  test("/events должен возвращать ошибку при пустом теле запроса", async () => {
    expect(
      await (await fetch(url("events"), { method: "POST" })).json()
    ).toEqual(fastify.errors.bodyMustBeObject);
  });

  test("/events должен формировать архив с событиями за заданный интервал времени", async () => {
    await events.request<[Array<UserActivityEvent>]>(
      eventsEventNames.createMultiple,
      eventsEventNames.createMultipleAfter,
      [
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-01-08T11:15:32.789Z"),
          type: "click",
          userUUID: "x7y8z9a1-2b3c-4567-8901-234567890xyz",
          page: "landing",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-01-22T16:42:18.456Z"),
          type: "scroll",
          userUUID: "m4n5o6p7-8q9r-0123-4567-890123456mnp",
          page: "services",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-02-14T09:27:55.123Z"),
          type: "page_view",
          userUUID: "x7y8z9a1-2b3c-4567-8901-234567890xyz",
          page: "portfolio",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-02-28T14:58:07.890Z"),
          type: "hover",
          userUUID: "k1l2m3n4-5o6p-7890-1234-567890123klm",
          page: "gallery",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-03-15T07:33:41.234Z"),
          type: "double_click",
          userUUID: "m4n5o6p7-8q9r-0123-4567-890123456mnp",
          page: "downloads",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-03-29T19:14:26.567Z"),
          type: "form_submit",
          userUUID: "r9s0t1u2-3v4w-5678-9012-345678901rst",
          page: "newsletter",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-04-12T12:08:53.901Z"),
          type: "key_press",
          userUUID: "x7y8z9a1-2b3c-4567-8901-234567890xyz",
          page: "search",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-04-25T05:47:39.345Z"),
          type: "resize",
          userUUID: "g5h6i7j8-9k0l-1234-5678-901234567ghi",
          page: "pricing",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-05-18T18:21:14.678Z"),
          type: "focus",
          userUUID: "k1l2m3n4-5o6p-7890-1234-567890123klm",
          page: "support",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-05-30T13:56:02.012Z"),
          type: "blur",
          userUUID: "k1l2m3n4-5o6p-7890-1234-567890123klm",
          page: "support",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-06-07T21:29:48.456Z"),
          type: "scroll",
          userUUID: "r9s0t1u2-3v4w-5678-9012-345678901rst",
          page: "blog",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-06-20T08:15:35.789Z"),
          type: "click",
          userUUID: "m4n5o6p7-8q9r-0123-4567-890123456mnp",
          page: "testimonials",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-07-03T15:42:17.123Z"),
          type: "page_view",
          userUUID: "v2w3x4y5-6z7a-8901-2345-678901234vwx",
          page: "features",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-07-16T10:37:59.567Z"),
          type: "hover",
          userUUID: "x7y8z9a1-2b3c-4567-8901-234567890xyz",
          page: "team",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-08-02T17:04:23.890Z"),
          type: "double_click",
          userUUID: "g5h6i7j8-9k0l-1234-5678-901234567ghi",
          page: "resources",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-08-19T06:51:41.234Z"),
          type: "form_submit",
          userUUID: "k1l2m3n4-5o6p-7890-1234-567890123klm",
          page: "contact",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-09-05T14:18:07.678Z"),
          type: "key_press",
          userUUID: "v2w3x4y5-6z7a-8901-2345-678901234vwx",
          page: "search",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-09-22T20:35:52.012Z"),
          type: "page_view",
          userUUID: "r9s0t1u2-3v4w-5678-9012-345678901rst",
          page: "documentation",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-10-08T11:44:28.345Z"),
          type: "scroll",
          userUUID: "x7y8z9a1-2b3c-4567-8901-234567890xyz",
          page: "api",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-10-24T16:12:15.789Z"),
          type: "resize",
          userUUID: "m4n5o6p7-8q9r-0123-4567-890123456mnp",
          page: "dashboard",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-11-09T09:07:33.123Z"),
          type: "focus",
          userUUID: "g5h6i7j8-9k0l-1234-5678-901234567ghi",
          page: "settings",
        },
        {
          eventType: "userActivity",
          occurrenceTime: new Date("2024-12-18T22:59:46.567Z"),
          type: "click",
          userUUID: "v2w3x4y5-6z7a-8901-2345-678901234vwx",
          page: "profile",
        },
      ]
    );
    const response = await post(url("events"), {
      body: JSON.stringify({
        timeInterval: {
          start: "2024-06-01",
          end: "2024-10-01",
        },
      }),
    });
    expect(response.statusCode).toBe(200);
    expect(() => new URL(response.archiveURL)).not.toThrowError("Invalid URL");
    const zipPath = join(tmpdir(), "test.archive.events.zip");
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
          ? omit(["createTime"], {
              ...e,
              occurrenceTime: new Date(e.occurrenceTime),
            })
          : e
      )
    ).toEqual([
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-06-07T21:29:48.456Z"),
        type: "scroll",
        userUUID: "r9s0t1u2-3v4w-5678-9012-345678901rst",
        page: "blog",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-06-20T08:15:35.789Z"),
        type: "click",
        userUUID: "m4n5o6p7-8q9r-0123-4567-890123456mnp",
        page: "testimonials",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-07-03T15:42:17.123Z"),
        type: "page_view",
        userUUID: "v2w3x4y5-6z7a-8901-2345-678901234vwx",
        page: "features",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-07-16T10:37:59.567Z"),
        type: "hover",
        userUUID: "x7y8z9a1-2b3c-4567-8901-234567890xyz",
        page: "team",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-08-02T17:04:23.890Z"),
        type: "double_click",
        userUUID: "g5h6i7j8-9k0l-1234-5678-901234567ghi",
        page: "resources",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-08-19T06:51:41.234Z"),
        type: "form_submit",
        userUUID: "k1l2m3n4-5o6p-7890-1234-567890123klm",
        page: "contact",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-09-05T14:18:07.678Z"),
        type: "key_press",
        userUUID: "v2w3x4y5-6z7a-8901-2345-678901234vwx",
        page: "search",
      },
      {
        eventType: "userActivity",
        occurrenceTime: new Date("2024-09-22T20:35:52.012Z"),
        type: "page_view",
        userUUID: "r9s0t1u2-3v4w-5678-9012-345678901rst",
        page: "documentation",
      },
    ]);
    await unlink(zipPath);
  });
});
