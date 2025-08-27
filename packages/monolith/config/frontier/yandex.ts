import { BuildConfig, defineModule } from "@atlz253/frontier";
import { MongoClientOptions } from "mongodb";

import { configSchema as eventsConfigSchema } from "../../../events/src/index.js";
import { tlsCAFile } from "../../../shared/src/cloud-function/tlsCAFile.js";

export default async (): Promise<BuildConfig> => ({
  modules: {
    events: defineModule({
      arguments: eventsConfigSchema.parse({
        storage:
          process.env.EVENTS_STORAGE_TYPE === "mongo"
            ? {
                options: {
                  tls: true,
                  tlsCAFile: await tlsCAFile(),
                  authSource: "events",
                } as MongoClientOptions,
              }
            : {},
      }),
    }),
  },
});
