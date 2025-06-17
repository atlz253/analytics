import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";
import eventNames from "../../../report/src/events.js";

export default ((fastify, { events }, done) => {
  fastify.route({
    method: "POST",
    url: "/users",
    handler: async (request, reply) => {
      const users = await events.request(
        eventNames.createUsersReport,
        eventNames.createUsersReportAfter,
        request.body
      );
      return { statusCode: 200, users: users };
    },
    schema: {
      body: {
        type: "object",
        required: ["timeInterval"],
        properties: {
          timeInterval: {
            type: "object",
            required: ["start"],
            properties: {
              start: {
                type: "string",
                format: "date",
              },
              end: {
                type: "string",
                format: "date",
              },
            },
          },
        },
      },
    },
  });

  fastify.route({
    method: "POST",
    url: "/user",
    handler: async (request, reply) => {
      return { statusCode: 200 };
    },
    schema: {
      body: {
        type: "object",
        required: ["timeInterval"],
        properties: {
          timeInterval: {
            type: "object",
            required: ["start"],
            properties: {
              start: {
                type: "string",
                format: "date",
              },
              end: {
                type: "string",
                format: "date",
              },
            },
          },
        },
      },
    },
  });

  fastify.route({
    method: "POST",
    url: "/eventTypes",
    handler: async (request, reply) => {
      return { statusCode: 200 };
    },
    schema: {
      body: {
        type: "object",
        required: ["timeInterval"],
        properties: {
          timeInterval: {
            type: "object",
            required: ["start"],
            properties: {
              start: {
                type: "string",
                format: "date",
              },
              end: {
                type: "string",
                format: "date",
              },
            },
          },
        },
      },
    },
  });

  fastify.route({
    method: "POST",
    url: "/eventAverageTime",
    handler: async (request, reply) => {
      return { statusCode: 200 };
    },
    schema: {
      body: {
        type: "object",
        required: ["timeInterval"],
        properties: {
          timeInterval: {
            type: "object",
            required: ["start"],
            properties: {
              start: {
                type: "string",
                format: "date",
              },
              end: {
                type: "string",
                format: "date",
              },
            },
          },
        },
      },
    },
  });

  done();
}) as FastifyPluginCallback<{
  events: ImmutableEventEmitter;
}>;
