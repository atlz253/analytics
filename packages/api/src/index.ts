import Fastify from "fastify";
import pingRoute from "./routes/ping.js";
import eventRoute from "./routes/event.js";
import reportRoute from "./routes/report.js";
import archiveRoute from "./routes/archive.js";
import { AbstractArchive } from "../../archive/src/index.js";
import { Ping } from "../../ping/src/index.js";
import { AbstractReport } from "../../report/src/index.js";
import { AbstractEvents } from "../../events/src/index.js";

export class API {
  #port;
  #fastify;

  get port() {
    if (this.#port === undefined) {
      const info = this.#fastify.server.address();
      return info === null || typeof info === "string" ? undefined : info.port;
    } else {
      return this.#port;
    }
  }

  constructor({
    events,
    archive,
    report,
    logger = false,
    ping = new Ping(),
    port,
  }: {
    events: AbstractEvents;
    archive: AbstractArchive;
    report: AbstractReport;
    ping?: Ping;
    logger?: boolean;
    port?: number;
  }) {
    this.#port = port;
    this.#fastify = Fastify({ logger });
    this.#fastify.register(eventRoute, { events, prefix: "/event" });
    this.#fastify.register(reportRoute, { report, prefix: "/report" });
    this.#fastify.register(pingRoute, { ping, prefix: "/ping" });
    this.#fastify.register(archiveRoute, {
      archive,
      prefix: "/archive",
    });
  }

  async listen() {
    await this.#fastify.listen({ port: this.#port ?? 0, host: "0.0.0.0" });
  }

  async close() {
    await this.#fastify.close();
  }
}
