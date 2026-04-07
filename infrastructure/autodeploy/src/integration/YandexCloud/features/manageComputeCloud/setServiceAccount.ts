import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function setServiceAccount({
  instanceName,
  serviceAccountName,
}: {
  instanceName: string;
  serviceAccountName: string;
}) {
  await execa`${YC_PATH} compute instance update ${instanceName} --service-account-name ${serviceAccountName}`;
}
