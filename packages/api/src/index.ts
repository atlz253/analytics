import Fastify from "fastify";
import EventEmitter from "node:events";
import pingRoute from "./routes/ping";
import eventRoute from "./routes/event";

export class API {
  #events;
  #fastify;

  get port() {
    const info = this.#fastify.server.address();
    return info === null || typeof info === "string" ? undefined : info.port;
  }

  constructor({
    events,
    logger = false,
  }: {
    events: EventEmitter;
    logger?: boolean;
  }) {
    this.#events = events;
    this.#fastify = Fastify({ logger });
    [pingRoute, eventRoute].forEach((r) =>
      this.#fastify.register(r, { events })
    );
  }

  async listen() {
    try {
      await this.#fastify.listen({ port: 0, host: "0.0.0.0" });
    } catch (err) {
      // this.#fastify.log.error(err);
      console.error(err);
      process.exit(1);
    }
  }

  async close() {
    await this.#fastify.close();
  }
}
