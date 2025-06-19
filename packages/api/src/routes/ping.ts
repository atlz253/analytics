import { FastifyPluginCallback } from "fastify";
import { Ping } from "../../../ping/src/index.js";

export default ((fastify, { ping }, done) => {
  fastify.get("/", async () => {
    return { statusCode: 200, response: ping.pong() };
  });
  done();
}) as FastifyPluginCallback<{ ping: Ping }>;
