import Fastify from "fastify";
import EventEmitter, { once } from "node:events";
import pingEvents from "../../ping/src/events";

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
    this.#fastify = Fastify({ logger });
    this.#fastify.get("/ping", async (request, reply) => {
      const promise = once(this.#events, pingEvents.pong);
      this.#events.emit(pingEvents.ping);
      const [response] = await promise;
      return { response };
    });
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
