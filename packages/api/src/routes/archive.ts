import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";
import timeIntervalSchema from "../schemas/timeIntervalSchema.js";

export default ((fastify, { events }, done) => {
  fastify.route({
    method: "POST",
    url: "/events",
    schema: {
      body: {
        type: "object",
        required: ["timeInterval"],
        properties: {
          timeInterval: timeIntervalSchema,
        },
      },
    },
    handler: async (request, reply) => {},
  });

  done();
}) as FastifyPluginCallback<{ events: ImmutableEventEmitter }>;
