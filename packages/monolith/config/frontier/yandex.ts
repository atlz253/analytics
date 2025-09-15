import { BuildConfig, defineModule } from "@atlz253/frontier";
import { tlsCAFile } from "@atlz253/shared/cloud-function/tlsCAFile";
import { MongoClientOptions } from "mongodb";

export default async (): Promise<BuildConfig> => ({
  modules: {
    events: defineModule({
      arguments: {
        storage:
          process.env.EVENTS_STORAGE_TYPE === "mongo"
            ? {
                // FIXME: весь конфиг перезаписывается
                options: {
                  tls: true,
                  tlsCAFile: await tlsCAFile(),
                } as MongoClientOptions,
              }
            : {},
      },
    }),
    api: defineModule({
      arguments: {
        archive: {
          url: ({ uuid }: { uuid: string }) =>
            `https://storage.yandexcloud.net/${process.env.ARCHIVE_STORAGE_YS3_BUCKET_NAME}/events/${uuid}.zip`,
        },
      },
    }),
  },
});
