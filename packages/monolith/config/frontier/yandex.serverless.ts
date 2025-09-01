import { archiveURLFunction } from "@atlz253/api/routes/archive";
import { configSchema as archiveConfigSchema } from "@atlz253/archive";
import { configSchema as eventsConfigSchema } from "@atlz253/events";
import { BuildConfig, defineModule } from "@atlz253/frontier";
import { CloudFunctionReport } from "@atlz253/report";

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
