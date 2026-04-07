import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { parseKeyValueOutput } from "../../utils/output/parseKeyValueOutput.ts";
import type { ServiceAccountInfo } from "./types.ts";

export async function createServiceAccount({ name }: { name: string }) {
  const { stdout } =
    await execa`${YC_PATH} iam service-account create --name ${name}`;
  return parseKeyValueOutput(stdout) as unknown as ServiceAccountInfo;
}
