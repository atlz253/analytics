import { FastifyPluginCallback } from "fastify";
import timeIntervalSchema from "../schemas/timeIntervalSchema.js";
import { AbstractReport } from "../../../report/src/index.js";
import { TimeInterval } from "../../../shared/src/types/timeInterval.js";

export default ((fastify, { report }, done) => {
  fastify.route<{ Body: { timeInterval: TimeInterval } }>({
    method: "POST",
    url: "/users",
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
      return {
        statusCode: 200,
        users: await report.createUsersReport(request.body),
      };
    },
  });

  fastify.route<{ Body: { timeInterval: TimeInterval; userUUID: string } }>({
    method: "POST",
    url: "/user",
    schema: {
      body: {
        type: "object",
        required: ["timeInterval", "userUUID"],
        properties: {
          userUUID: {
            type: "string",
            format: "uuid",
          },
          timeInterval: timeIntervalSchema,
        },
      },
    },
    handler: async (request, reply) => {
      return {
        ...(await report.createUserReport(request.body)),
        statusCode: 200,
      };
    },
  });

  fastify.route<{ Body: { timeInterval: TimeInterval } }>({
    method: "POST",
    url: "/eventTypes",
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
      return {
        ...(await report.createEventTypesReport(request.body)),
        statusCode: 200,
      };
    },
  });

  fastify.route<{ Body: { timeInterval: TimeInterval } }>({
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
      return {
        statusCode: 200,
        events: await report.createEventsReport(request.body),
      };
    },
  });

  done();
}) as FastifyPluginCallback<{
  report: AbstractReport;
}>;
