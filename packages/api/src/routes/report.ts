import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";
import eventNames from "../../../report/src/events.js";

export default ((fastify, { events }, done) => {
  fastify.route({
    method: "POST",
    url: "/users",
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
    handler: async (request, reply) => {
      const users = await events.request(
        eventNames.createUsersReport,
        eventNames.createUsersReportAfter,
        request.body
      );
      return { statusCode: 200, users: users };
    },
  });

  fastify.route({
    method: "POST",
    url: "/user",
    schema: {
      body: {
        type: "object",
        required: ["timeInterval", "userUUID"],
        properties: {
          userUUID: {
            type: "string",
          },
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
    handler: async (request, reply) => {
      const userData = await events.request(
        eventNames.createUserReport,
        eventNames.createUserReportAfter,
        request.body
      );
      if (typeof userData === "object" && userData !== null) {
        return { ...userData, statusCode: 200 };
      } else {
        return {
          statusCode: 500,
          code: "REPORT_ERR_USER_DATA",
          error: "Неверный формат данных о пользователе",
          message:
            "Системе не удалось обработать пришедший формат данных о пользователе",
        };
      }
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
