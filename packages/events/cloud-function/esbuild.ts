import { resolve } from "node:path";
import { cwd } from "node:process";

import dotenv from "dotenv";
import esbuild from "esbuild";

dotenv.config({
  path: ["./cloud-function/.env.local", "./cloud-function/.env"].map((f) =>
    resolve(cwd(), f),
  ),
  quiet: true,
});

await esbuild.build({
  entryPoints: ["cloud-function/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22.15",
  outfile: "./dist/cloud-function/index.js",
  minify: true,
  define: {
    "process.env.MONGO_USER": JSON.stringify(process.env.MONGO_USER!),
    "process.env.MONGO_PASSWORD": JSON.stringify(process.env.MONGO_PASSWORD!),
    "process.env.MONGO_HOSTS": JSON.stringify(process.env.MONGO_HOSTS!),
    "process.env.QUEUE_ACCESS_KEY_ID": JSON.stringify(
      process.env.QUEUE_ACCESS_KEY_ID!,
    ),
    "process.env.QUEUE_SECRET_ACCESS_KEY": JSON.stringify(
      process.env.QUEUE_SECRET_ACCESS_KEY!,
    ),
    "process.env.QUEUE_RESPONSE_URL": JSON.stringify(
      process.env.QUEUE_RESPONSE_URL!,
    ),
  },
});
