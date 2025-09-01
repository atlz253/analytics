import { AbstractArchive, ArchiveMock } from "@atlz253/archive";
import { AbstractEvents, EventsMock } from "@atlz253/events";
import { Builder, classBuilder, defineModule } from "@atlz253/frontier";
import { Ping } from "@atlz253/ping";
import { AbstractReport, ReportMock } from "@atlz253/report";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { API } from "../src/index.js";
import { localhost } from "./utils/address.js";

interface Modules {
  api: API;
  events: AbstractEvents;
  archive: AbstractArchive;
  report: AbstractReport;
}

describe("/ping", () => {
  let modules: Modules;

  beforeEach(async () => {
    modules = await new Builder().build({
      modules: {
        events: defineModule({
          builder: classBuilder(EventsMock),
        }),
        archive: defineModule({
          builder: classBuilder(ArchiveMock),
        }),
        report: defineModule({
          builder: classBuilder(ReportMock),
        }),
        ping: defineModule({
          builder: classBuilder(Ping),
        }),
        api: defineModule({
          builder: classBuilder(API),
          dependencies: ["events", "archive", "report", "ping"],
        }),
      },
    });
    await modules.api.listen();
  });

  afterEach(async () => {
    await modules.api.close();
  });

  test("возвращает pong", async () => {
    const response = await fetch(localhost(modules.api.port) + "/ping");
    expect(await response.json()).toEqual({
      statusCode: 200,
      response: "pong",
    });
  });
});
