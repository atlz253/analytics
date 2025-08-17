import { BuildConfig, defineModule } from "@atlz253/frontier";
import { configSchema as eventsConfigSchema } from "../../../events/src/index.js";

export default async (): Promise<BuildConfig> => ({
  modules: {
    events: defineModule({
      arguments: eventsConfigSchema.parse({
        cloudFunction: true,
      }),
    }),
  },
});
