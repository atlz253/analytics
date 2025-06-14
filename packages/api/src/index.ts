import Fastify from "fastify";
import EventEmitter from "node:events";
import pingRoute from "./routes/ping";

export class API {
  #events;
  #fastify;

  constructor({
    events,
    logger = false,
  }: {
    events: EventEmitter;
    logger?: boolean;
  }) {
    this.#events = events;
    this.#fastify = Fastify({ logger }).register(pingRoute, { events });
  }

  async listen() {
    try {
      await this.#fastify.listen({ port: 3000 });
    } catch (err) {
      this.#fastify.log.error(err);
      process.exit(1);
    }
  }

  async close() {
    await this.#fastify.close();
  }
}
