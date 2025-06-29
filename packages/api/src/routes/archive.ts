import { FastifyPluginCallback, FastifyRequest } from "fastify";
import timeIntervalSchema from "../schemas/timeIntervalSchema.js";
import urlJoin from "url-join";
import { AbstractArchive } from "../../../archive/src/index.js";
import { TimeInterval } from "../../../shared/src/types/timeInterval.js";

export interface ArchiveRouteOptions {
  module: AbstractArchive;
  archiveURL?: (options: { request: FastifyRequest; uuid: string }) => string;
}

export default ((fastify, { module: archive, archiveURL }, done) => {
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
        archiveURL: archiveURL
          ? archiveURL({ request, uuid: archiveUUID })
          : urlJoin(
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

  // TODO: сделать доступным только в режиме отладки
  fastify.route({
    method: "POST",
    url: "/drop_database",
    handler: async (request, reply) => {
      await archive.dropDatabase();
      return { statusCode: 200 };
    },
  });

  done();
}) as FastifyPluginCallback<ArchiveRouteOptions>;
