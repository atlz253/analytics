import { API } from "../../api/src/index.js";
import { AbstractEvents } from "../../events/src/index.js";
import { AbstractReport } from "../../report/src/index.js";
import { AbstractArchive } from "../../archive/src/index.js";
import { Builder } from "@atlz253/frontier";
import developConfig from "../config/frontier/develop.js";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { cwd } from "node:process";

(async () => {
  dotenv.config({
    path: [".env.develop", ".env"].map((f) => resolve(cwd(), f)),
  });
  const modules = await new Builder().build(
    ...(await Promise.all([developConfig()]))
  );
  const events = modules["events"] as AbstractEvents;
  const report = modules["report"] as AbstractReport;
  const archive = modules["archive"] as AbstractArchive;
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
