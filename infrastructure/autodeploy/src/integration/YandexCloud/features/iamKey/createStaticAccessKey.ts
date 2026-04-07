import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { parseKeyValueOutput } from "../../utils/output/parseKeyValueOutput.ts";
import type { StaticAccessKey } from "./types.ts";

export async function createStaticAccessKey(accountName: string) {
  const { stdout } =
    await execa`${YC_PATH} iam access-key create --service-account-name ${accountName}`;
  return parseKeyValueOutput(stdout) as unknown as StaticAccessKey;
}
