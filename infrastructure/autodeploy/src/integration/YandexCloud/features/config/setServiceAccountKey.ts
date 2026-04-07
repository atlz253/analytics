import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function setServiceAccountKey(fileName: string) {
  await execa`${YC_PATH} config set service-account-key ${fileName}`;
}
