import Fastify from "fastify";
import pingRoute from "./routes/ping";
import eventRoute from "./routes/event";
import { ImmutableEventEmitter } from "../../shared/src/ImmutableEventEmitter";

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
    events: ImmutableEventEmitter;
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
      this.#fastify.log.error(err);
      process.exit(1);
    }
  }

  async close() {
    await this.#fastify.close();
  }
}
