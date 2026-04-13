import {
  CloudFunctionArchive,
  configSchema as archiveConfigSchema,
  initArchive,
} from "@atlz253/archive";
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
          accessKeyId: process.env.QUEUES_ACCESS_KEY_ID!,
          secretAccessKey: process.env.QUEUES_SECRET_ACCESS_KEY!,
        },
      },
    }),
    reportFallback: defineModule({
      builder: (...props: ConstructorParameters<typeof Report>) =>
        new Report(...props),
      dependencies: ["events"],
    }),
    archive: defineModule({
      builder: (...props: ConstructorParameters<typeof CloudFunctionArchive>) =>
        new CloudFunctionArchive(...props),
      arguments: {
        requestQueueURL: process.env.ARCHIVE_QUEUE_REQUEST_URL!,
        responseQueueURL: process.env.ARCHIVE_QUEUE_RESPONSE_URL!,
        credentials: {
          accessKeyId: process.env.QUEUES_ACCESS_KEY_ID!,
          secretAccessKey: process.env.QUEUES_SECRET_ACCESS_KEY!,
        },
      },
      dependencies: {
        fallback: "archiveFallback",
      },
    }),
    archiveFallback: defineModule({
      builder: (...props: Parameters<typeof initArchive>) =>
        initArchive(...props),
      arguments: archiveConfigSchema.parse({
        cloudFunction: process.env.ARCHIVE_CLOUD_FUNCTION === "true",
        storage: {
          type: process.env.ARCHIVE_STORAGE_TYPE,
          user: process.env.ARCHIVE_STORAGE_MONGO_USER,
          password: process.env.ARCHIVE_STORAGE_MONGO_PASSWORD,
          hosts: process.env.ARCHIVE_STORAGE_MONGO_HOSTS,
          port: process.env.ARCHIVE_STORAGE_MONGO_PORT,
          region: process.env.ARCHIVE_STORAGE_YS3_REGION,
          bucketName: process.env.ARCHIVE_STORAGE_YS3_BUCKET_NAME,
          credentials: {
            accessKeyId: process.env.ARCHIVE_STORAGE_YS3_ACCESS_KEY_ID,
            secretAccessKey: process.env.ARCHIVE_STORAGE_YS3_SECRET_ACCESS_KEY,
          },
          options: {
            authSource: process.env.ARCHIVE_STORAGE_MONGO_DB_NAME,
          },
        },
      }),
      dependencies: ["events"],
    }),
  },
});
