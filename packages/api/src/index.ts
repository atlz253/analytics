import Fastify from "fastify";
import pingRoute from "./routes/ping.js";
import eventRoute from "./routes/event.js";
import reportRoute from "./routes/report.js";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter.js";
import archiveRoute from "./routes/archive.js";
import { Archive } from "../../archive/src/index.js";

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
    logger = false,
    port,
  }: {
    events: ImmutableEventEmitter;
    archive: Archive;
    logger?: boolean;
    port?: number;
  }) {
    this.#port = port;
    this.#fastify = Fastify({ logger });
    (
      [
        [pingRoute, { events, prefix: "/ping" }],
        [eventRoute, { events, prefix: "/event" }],
        [reportRoute, { events, prefix: "/report" }],
      ] as const
    ).forEach(([plugin, opts]) => this.#fastify.register(plugin, opts));
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
