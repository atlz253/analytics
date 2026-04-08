import {
  setCloudId,
  setFolderId,
  setServiceAccountKey,
} from "../config/index.ts";
import type { ProfileConfig } from "./types.ts";

export async function setCurrentProfileConfig({
  keyPath,
  cloudId,
  folderId,
}: Partial<ProfileConfig>) {
  if (keyPath || cloudId || folderId) {
    await Promise.all([
      keyPath ? setServiceAccountKey(keyPath) : null,
      cloudId ? setCloudId(cloudId) : null,
      folderId ? setFolderId(folderId) : null,
    ]);
  }
}
