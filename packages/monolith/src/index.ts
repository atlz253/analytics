import { resolve } from "node:path";
import { cwd } from "node:process";

import { Builder } from "@atlz253/frontier";
import dotenv from "dotenv";

import { API } from "../../api/src/index.js";
import developConfig from "../config/frontier/develop.js";

(async () => {
  dotenv.config({
    path: [".env.develop", ".env"].map((f) => resolve(cwd(), f)),
  });
  const modules = await new Builder().build(
    ...(await Promise.all([developConfig()]))
  );
  const api = modules["api"] as API;
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
