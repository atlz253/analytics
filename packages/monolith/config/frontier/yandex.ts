import { configSchema as eventsConfigSchema } from "@atlz253/events";
import { BuildConfig, defineModule } from "@atlz253/frontier";
import { tlsCAFile } from "@atlz253/shared/cloud-function/tlsCAFile";
import { MongoClientOptions } from "mongodb";

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
