import { BuildConfig, defineModule } from "@atlz253/frontier";
import { CloudFunctionReport, Report } from "@atlz253/report";

export default async (): Promise<BuildConfig> => ({
  modules: {
    report: defineModule({
      builder: (...props: ConstructorParameters<typeof CloudFunctionReport>) =>
        new CloudFunctionReport(...props),
      dependencies: {
        fallback: "reportFallback",
      },
      arguments: {
        requestQueueURL: process.env.REPORT_QUEUE_REQUEST_URL!,
        responseQueueURL: process.env.REPORT_QUEUE_RESPONSE_URL!,
        credentials: {
          accessKeyId: process.env.REPORT_QUEUE_ACCESS_KEY_ID!,
          secretAccessKey: process.env.REPORT_QUEUE_SECRET_ACCESS_KEY!,
        },
      },
    }),
    reportFallback: defineModule({
      builder: (...props: ConstructorParameters<typeof Report>) =>
        new Report(...props),
      dependencies: ["events"],
    }),
  },
});
