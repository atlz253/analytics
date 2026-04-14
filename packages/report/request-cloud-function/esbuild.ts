import { resolve } from "node:path";
import { cwd } from "node:process";

import dotenv from "dotenv";
import esbuild from "esbuild";

dotenv.config({
  path: [
    "./request-cloud-function/.env.local",
    "./request-cloud-function/.env",
  ].map((f) => resolve(cwd(), f)),
  quiet: true,
});

await esbuild.build({
  entryPoints: ["request-cloud-function/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22.15",
  outfile: "./dist/request-cloud-function/index.js",
  minify: true,
  define: {
    "process.env.QUEUE_ACCESS_KEY_ID": JSON.stringify(
      process.env.QUEUE_ACCESS_KEY_ID!,
    ),
    "process.env.QUEUE_SECRET_ACCESS_KEY": JSON.stringify(
      process.env.QUEUE_SECRET_ACCESS_KEY!,
    ),
    "process.env.REQUEST_QUEUE_URL": JSON.stringify(
      process.env.REQUEST_QUEUE_URL!,
    ),
    "process.env.RESPONSE_QUEUE_URL": JSON.stringify(
      process.env.RESPONSE_QUEUE_URL!,
    ),
  },
});
