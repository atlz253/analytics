import { FastifyPluginCallback } from "fastify";
import timeIntervalSchema from "../schemas/timeIntervalSchema.js";
import urlJoin from "url-join";
import { Archive } from "../../../archive/src/index.js";
import { TimeInterval } from "../../../shared/src/types/timeInterval.js";

export default ((fastify, { archive }, done) => {
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
      const archiveUUID = await archive.createEventsArchive(request.body);
      return {
        statusCode: 200,
        archiveURL: urlJoin(
          `${request.protocol}://`,
          request.host,
          request.url,
          archiveUUID
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
      const stream = await archive.readEventsArchive(request.params);
      if (stream) {
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
            `attachment; filename="${request.params.archiveUUID}.zip"`
          )
          .send(stream);
      } else {
        return { statusCode: 404, error: "File not found" };
      }
    },
  });

  done();
}) as FastifyPluginCallback<{ archive: Archive }>;
