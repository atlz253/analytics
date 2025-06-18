import { FastifyPluginCallback } from "fastify";
import eventNames from "../../../events/src/events.js";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";

interface UserActivityEvent {
  eventType: "userActivity";
  occurrenceTime: string;
  type: string;
  userUUID: string;
  page: string;
  [key: string]: unknown;
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
      await events.request(eventNames.create, eventNames.createAfter, {
        ...request.body,
        occurrenceTime: new Date(request.body.occurrenceTime),
      });
      return { statusCode: 200 };
    },
  });

  // TODO: включать данный endpoint только в режиме отладки
  fastify.route({
    method: "POST",
    url: "/drop_database",
    handler: async (request, reply) => {
      await events.request(
        eventNames.dropDatabase,
        eventNames.dropDatabaseAfter
      );
      return { statusCode: 200 };
    },
  });
  done();
}) as FastifyPluginCallback<{ events: ImmutableEventEmitter }>;
