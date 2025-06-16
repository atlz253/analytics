import { FastifyPluginCallback } from "fastify";
import EventEmitter from "node:events";
import eventNames from "../../../events/src/events";

interface UserActivityEvent {
  eventType: "userActivity";
  occurrenceTime: string;
  type: string;
  userUUID: string;
  page: string;
}

export default ((fastify, { events }, done) => {
  fastify.route<{ Body: UserActivityEvent }>({
    method: "POST",
    url: "/",
    schema: {
      body: {
        type: "object",
        required: ["eventType", "occurrenceTime", "type", "userUUID", "page"],
        properties: {
          eventType: {
            type: "string",
            enum: ["userActivity"],
          },
          occurrenceTime: {
            type: "string",
            format: "date-time",
          },
          type: {
            type: "string",
          },
          userUUID: {
            type: "string",
            format: "uuid",
          },
          page: {
            type: "string",
          },
        },
      },
    },
    handler: async (request, reply) => {
      events.emit(eventNames.create, request.body);
      return { statusCode: 200 };
    },
  });
  done();
}) as FastifyPluginCallback<{ events: EventEmitter }>;
