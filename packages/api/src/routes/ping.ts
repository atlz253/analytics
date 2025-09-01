import { Ping } from "@atlz253/ping";
import { FastifyPluginCallback } from "fastify";

export default ((fastify, { ping }, done) => {
  fastify.get("/", async () => {
    return { statusCode: 200, response: ping.pong() };
  });
  done();
}) as FastifyPluginCallback<{ ping: Ping }>;
