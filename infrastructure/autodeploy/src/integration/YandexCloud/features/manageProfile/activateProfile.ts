import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { createProfile } from "./createProfile.ts";
import { isProfileWithNameExists } from "./isProfileWithNameExists.ts";
import { setCurrentProfileConfig } from "./setCurrentProfileConfig.ts";
import type { ProfileConfig } from "./types.ts";

export async function activateProfileWithConfig({
  name,
  keyPath,
  cloudId,
  folderId,
}: { name: string } & Partial<ProfileConfig>) {
  const isProfileExists = await isProfileWithNameExists(name);

  if (!isProfileExists) {
    await createProfile({ name });
  }

  await activateProfile(name);
  await setCurrentProfileConfig({ keyPath, cloudId, folderId });
}

export async function activateProfile(name: string) {
  await execa`${YC_PATH} config profile activate ${name}`;
}
