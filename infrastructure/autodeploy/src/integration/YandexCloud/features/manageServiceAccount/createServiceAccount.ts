import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { parseKeyValueOutput } from "../../utils/output/parseKeyValueOutput.ts";
import { addServiceAccountCatalogRoles } from "./addServiceAccountCatalogRole.ts";
import type { ServiceAccountInfo } from "./types.ts";

export async function createServiceAccount({
  name,
  roles,
}: {
  name: string;
  roles?: string[];
}) {
  const { stdout } =
    await execa`${YC_PATH} iam service-account create --name ${name}`;
  const result = parseKeyValueOutput(stdout) as unknown as ServiceAccountInfo;
  if (roles) {
    await addServiceAccountCatalogRoles({
      roles,
      catalogID: result.folder_id,
      serviceAccountID: result.id,
    });
  }
  return result;
}
