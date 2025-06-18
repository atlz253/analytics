import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";
import eventNames from "../../../report/src/events.js";
import { EventTypesReport, UserReport } from "../../../report/src/types.js";
import { UserActivityEvent } from "events/src/types.js";

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
      const userData = (await events.request(
        eventNames.createUserReport,
        eventNames.createUserReportAfter,
        request.body
      )) as UserReport;
      return { ...userData, statusCode: 200 };
    },
  });

  fastify.route({
    method: "POST",
    url: "/eventTypes",
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
      const report = (await events.request(
        eventNames.createEventTypesReport,
        eventNames.createEventTypesReportAfter,
        request.body
      )) as EventTypesReport;
      return { ...report, statusCode: 200 };
    },
  });

  fastify.route({
    method: "POST",
    url: "/events",
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
      const userEvents = (await events.request(
        eventNames.createEventsReport,
        eventNames.createEventsReportAfter,
        request.body
      )) as Array<UserActivityEvent>;
      return { statusCode: 200, events: userEvents };
    },
  });

  done();
}) as FastifyPluginCallback<{
  events: ImmutableEventEmitter;
}>;
