import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter";

export default ((fastify, { events }, done) => {
  fastify.route({
    method: "POST",
    url: "/users",
    handler: async (request, reply) => {
      return { statusCode: 200 };
    },
  });

  done();
}) as FastifyPluginCallback<{
  events: ImmutableEventEmitter;
}>;
