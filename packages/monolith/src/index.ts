import { API } from "../../api/src/index.js";
import { AbstractEvents } from "../../events/src/index.js";
import { Report } from "../../report/src/index.js";
import { initArchive } from "../../archive/src/index.js";
import { Builder } from "@atlz253/frontier";
import developConfig from "../config/frontier/develop.js";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

(async () => {
  dotenv.config({
    path: [".env.develop", ".env"].map((f) =>
      resolve(dirname(fileURLToPath(import.meta.url)), "..", f)
    ),
  });
  const modules = await new Builder().build(
    ...(await Promise.all([developConfig()]))
  );
  const events = modules["events"] as AbstractEvents;
  const report = new Report({ events });
  const archive = await initArchive({ events, storage: { type: "mongo" } });
  const api = new API({
    events,
    archive: { module: archive },
    report,
    logger: true,
    port: 3000,
  });
  await api.listen();
  console.log(`API доступен по адресу: http://localhost:${api.port}`);
})();
