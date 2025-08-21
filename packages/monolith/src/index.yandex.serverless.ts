import { API } from "../../api/src/index.js";
import { Builder } from "@atlz253/frontier";
import developConfig from "../config/frontier/develop.js";
import yandexConfig from "../config/frontier/yandex.js";
import serverlessYandexConfig from "../config/frontier/yandex.serverless.js";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { cwd } from "node:process";

(async () => {
  dotenv.config({
    path: [".env.yandex.serverless", ".env.yandex", ".env"].map((f) =>
      resolve(cwd(), f)
    ),
  });
  const modules = await new Builder().build(
    ...(await Promise.all([
      developConfig(),
      yandexConfig(),
      serverlessYandexConfig(),
    ]))
  );
  const api = modules["api"] as API;
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
