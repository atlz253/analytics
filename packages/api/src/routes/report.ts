import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";

export default ((fastify, { events }, done) => {
  fastify.route({
    method: "POST",
    url: "/users",
    handler: async (request, reply) => {
      return { statusCode: 200 };
    },
    schema: {
      body: {
        type: "object",
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
      },
    },
  });

  done();
}) as FastifyPluginCallback<{
  events: ImmutableEventEmitter;
}>;
