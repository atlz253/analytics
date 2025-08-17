import { BuildConfig, defineModule } from "@atlz253/frontier";
import {
  initEvents,
  configSchema as eventsConfigSchema,
} from "../../../events/src/index.js";
import { Report } from "../../../report/src/index.js";

export default async (): Promise<BuildConfig> => ({
  modules: {
    events: defineModule({
      builder: (...props: Parameters<typeof initEvents>) =>
        initEvents(...props),
      arguments: eventsConfigSchema.parse({
        storage: {
          type: process.env.EVENTS_STORAGE_TYPE,
          user: process.env.EVENTS_STORAGE_MONGO_USER,
          password: process.env.EVENTS_STORAGE_MONGO_PASSWORD,
          hosts: process.env.EVENTS_STORAGE_MONGO_HOSTS,
          port: process.env.EVENTS_STORAGE_MONGO_PORT,
        },
      }),
    }),
    report: defineModule({
      builder: (...props: ConstructorParameters<typeof Report>) =>
        new Report(...props),
      dependencies: ["events"],
    }),
  },
});
