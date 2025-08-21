import { BuildConfig, defineModule } from "@atlz253/frontier";
import { configSchema as eventsConfigSchema } from "../../../events/src/index.js";
import { CloudFunctionReport } from "../../../report/src/index.js";
import { configSchema as archiveConfigSchema } from "../../../archive/src/index.js";
import { archiveURLFunction } from "../../../api/src/routes/archive.js";

export default async (): Promise<BuildConfig> => ({
  modules: {
    events: defineModule({
      arguments: eventsConfigSchema.parse({
        cloudFunction: true,
      }),
    }),
    report: defineModule({
      builder: (...props: ConstructorParameters<typeof CloudFunctionReport>) =>
        new CloudFunctionReport(...props),
      dependencies: { fallback: "reportFallback" },
    }),
    reportFallback: defineModule({
      builder: (...props: ConstructorParameters<typeof Report>) =>
        new Report(...props),
      dependencies: ["events"],
    }),
    archive: defineModule({
      arguments: archiveConfigSchema.parse({
        archive: {
          url: archiveURLFunction.implement(
            ({ uuid }: { uuid: string }) =>
              `https://storage.yandexcloud.net/events-archives/events/${uuid}.zip`
          ),
        },
      }),
    }),
  },
});
