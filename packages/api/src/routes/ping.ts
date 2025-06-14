import { FastifyPluginCallback } from "fastify";
import EventEmitter, { once } from "node:events";
import pingEvents from "../../../ping/src/events";

export default ((fastify, { events }, done) => {
  fastify.get("/ping", async () => {
    const promise = once(events, pingEvents.pong);
    events.emit(pingEvents.ping);
    const [response] = await promise;
    return { response };
  });
  done();
}) as FastifyPluginCallback<{ events: EventEmitter }>;
