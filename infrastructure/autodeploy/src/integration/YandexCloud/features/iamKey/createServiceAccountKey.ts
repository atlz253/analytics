import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function createServiceAccountKey({
  serviceAccountID,
  catalogName,
  fileName,
}: {
  serviceAccountID: string;
  catalogName: string;
  fileName: string;
}) {
  await execa`${YC_PATH} iam key create --service-account-id ${serviceAccountID} --folder-name ${catalogName} --output ${fileName}`;
}
