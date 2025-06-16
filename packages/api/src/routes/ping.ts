import { FastifyPluginCallback } from "fastify";
import pingEvents from "../../../ping/src/events";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter";

export default ((fastify, { events }, done) => {
  fastify.get("/", async () => {
    const response = await events.request<string>(
      pingEvents.ping,
      pingEvents.pong
    );
    return { statusCode: 200, response };
  });
  done();
}) as FastifyPluginCallback<{ events: ImmutableEventEmitter }>;
