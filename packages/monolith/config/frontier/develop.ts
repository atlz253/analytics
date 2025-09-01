import { API, configSchema as APIConfigSchema } from "@atlz253/api";
import {
  configSchema as archiveConfigSchema,
  initArchive,
} from "@atlz253/archive";
import {
  configSchema as eventsConfigSchema,
  initEvents,
} from "@atlz253/events";
import { BuildConfig, defineModule } from "@atlz253/frontier";
import { Ping } from "@atlz253/ping";
import { Report } from "@atlz253/report";

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
    archive: defineModule({
      builder: (...props: Parameters<typeof initArchive>) =>
        initArchive(...props),
      arguments: archiveConfigSchema.parse({
        cloudFunction: Boolean(process.env.ARCHIVE_CLOUD_FUNCTION),
        storage: {
          type: process.env.ARCHIVE_STORAGE_TYPE,
          user: process.env.ARCHIVE_STORAGE_MONGO_USER,
          password: process.env.ARCHIVE_STORAGE_MONGO_PASSWORD,
          hosts: process.env.ARCHIVE_STORAGE_MONGO_HOSTS,
          port: process.env.ARCHIVE_STORAGE_MONGO_PORT,
          region: process.env.ARCHIVE_STORAGE_YS3_REGION,
          credentials: {
            accessKeyId: process.env.ARCHIVE_STORAGE_YS3_ACCESS_KEY_ID,
            secretAccessKey: process.env.ARCHIVE_STORAGE_YS3_SECRET_ACCESS_KEY,
          },
        },
      }),
      dependencies: ["events"],
    }),
    ping: defineModule({
      builder: (...props: ConstructorParameters<typeof Ping>) =>
        new Ping(...props),
    }),
    api: defineModule({
      builder: (...props: ConstructorParameters<typeof API>) =>
        new API(...props),
      arguments: APIConfigSchema.parse({
        logger: Boolean(process.env.API_LOGGER),
        port: process.env.API_PORT,
      }),
      dependencies: ["events", "report", "archive", "ping"],
    }),
  },
});
