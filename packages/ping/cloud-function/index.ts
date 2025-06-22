import { Handler } from "@yandex-cloud/function-types";
import { Ping } from "../src/index.js";

export const handler: Handler.Http = async (event, context) => {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      statusCode: 200,
      response: new Ping().pong(),
    }),
  };
};
