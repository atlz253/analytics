import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { parseKeyValueOutput } from "../../utils/output/index.ts";
import type { ServiceAccountInfo } from "./types.ts";

export async function getServiceAccountInfoWithName(name: string) {
  const { stdout } = await execa`${YC_PATH} iam service-account get ${name}`;
  return parseKeyValueOutput(stdout) as unknown as ServiceAccountInfo;
}
