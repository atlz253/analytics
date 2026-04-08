import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { setCurrentProfileConfig } from "./setCurrentProfileConfig.ts";
import type { ProfileConfig } from "./types.ts";

export async function createProfile({
  name,
  keyPath,
  cloudId,
  folderId,
}: {
  name: string;
} & Partial<ProfileConfig>) {
  await execa`${YC_PATH} config profile create ${name}`;

  await setCurrentProfileConfig({ keyPath, cloudId, folderId });
}
