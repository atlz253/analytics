import { ArchiveMock } from "@atlz253/archive";
import { EventsMock } from "@atlz253/events";
import { Ping } from "@atlz253/ping";
import { ReportMock } from "@atlz253/report";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { API } from "../src/index.js";
import { localhost } from "./utils/address.js";

describe("/ping", () => {
  let api = new API({
    // FIXME: исправить тесты
    events: new EventsMock(),
    archive: { module: new ArchiveMock() },
    report: new ReportMock(),
  });

  beforeEach(async () => {
    api = new API({
      events: new EventsMock(),
      archive: { module: new ArchiveMock() },
      report: new ReportMock(),
    });
    new Ping();
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
