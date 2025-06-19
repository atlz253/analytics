import { AbstractEvents } from "../../../events/src/index.js";
import { FastifyPluginCallback, FastifySchema } from "fastify";

interface UserActivityEvent {
  eventType: "userActivity";
  occurrenceTime: string;
  type: string;
  userUUID: string;
  page: string;
  [key: string]: unknown;
}

const userActivityEventSchema = {
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
} as const;

export default ((fastify, { events }, done) => {
  fastify.route<{ Body: UserActivityEvent }>({
    method: "POST",
    url: "/",
    schema: {
      body: userActivityEventSchema,
    },
    handler: async (request, reply) => {
      await events.createEvent({
        ...request.body,
        occurrenceTime: new Date(request.body.occurrenceTime),
      });
      return { statusCode: 200 };
    },
  });

  fastify.route<{ Body: UserActivityEvent[] }>({
    method: "POST",
    url: "/create_multiple",
    schema: {
      body: {
        type: "array",
        items: userActivityEventSchema,
      },
    },
    handler: async (request, reply) => {
      await events.createEvents(
        request.body.map((e) => ({
          ...e,
          occurrenceTime: new Date(e.occurrenceTime),
        }))
      );
      return { statusCode: 200 };
    },
  });

  // TODO: включать данный endpoint только в режиме отладки
  fastify.route({
    method: "POST",
    url: "/drop_database",
    handler: async (request, reply) => {
      await events.dropDatabase();
      return { statusCode: 200 };
    },
  });
  done();
}) as FastifyPluginCallback<{ events: AbstractEvents }>;
