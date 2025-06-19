import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { API } from "../src/index.js";
import { Ping } from "../../ping/src/index.js";
import { localhost } from "./utils/address.js";
import { ArchiveMock } from "../../archive/src/index.js";
import { ReportMock } from "../../report/src/index.js";
import { EventsMock } from "../../events/src/index.js";

describe("/ping", () => {
  let api = new API({
    events: new EventsMock(),
    archive: new ArchiveMock(),
    report: new ReportMock(),
  });

  beforeEach(async () => {
    api = new API({
      events: new EventsMock(),
      archive: new ArchiveMock(),
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
