import { FastifyPluginCallback } from "fastify";
import { ImmutableEventEmitter } from "../../../shared/src/ImmutableEventEmitter.js";
import timeIntervalSchema from "../schemas/timeIntervalSchema.js";
import eventNames from "../../../archive/src/events.js";
import urlJoin from "url-join";
import { createReadStream } from "node:fs";
import { basename } from "node:path";

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

  fastify.route<{ Params: { archiveUUID: string } }>({
    method: "GET",
    url: "/events/:archiveUUID",
    schema: {
      params: {
        type: "object",
        required: ["archiveUUID"],
        properties: {
          archiveUUID: {
            type: "string",
            format: "uuid",
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { archiveUUID } = request.params;
      const response = (await events.request(
        eventNames.readEventsArchive,
        eventNames.readEventsArchiveAfter,
        { archiveUUID }
      )) as { found: false } | { found: true; path: string };
      if (response.found) {
        try {
          const stream = createReadStream(response.path);
          stream.on("error", (error) => {
            reply.send({
              statusCode: 500,
              error: "Error streaming file",
            });
          });
          return reply
            .type("application/zip")
            .header(
              "Content-Disposition",
              `attachment; filename="${basename(response.path)}"`
            )
            .send(stream);
        } catch (error) {
          return {
            statusCode: 500,
            error: "Error accessing file'",
          };
        }
      } else {
        return { statusCode: 404, error: "File not found" };
      }
    },
  });

  done();
}) as FastifyPluginCallback<{ events: ImmutableEventEmitter }>;
