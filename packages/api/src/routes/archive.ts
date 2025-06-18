import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";
import timeIntervalSchema from "../schemas/timeIntervalSchema.js";
import eventNames from "../../../archive/src/events.js";
import urlJoin from "url-join";

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
    handler: async (request, reply) => {
      const response = (await events.request(
        eventNames.createEventsArchive,
        eventNames.createEventsArchiveAfter,
        request.body
      )) as { archiveUUID: string };
      return {
        statusCode: 200,
        archiveURL: urlJoin(
          `${request.protocol}://`,
          request.host,
          request.url,
          response.archiveUUID
        ),
      };
    },
  });

  done();
}) as FastifyPluginCallback<{ events: ImmutableEventEmitter }>;
