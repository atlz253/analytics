import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { parseKeyValueOutput } from "../../utils/output/parseKeyValueOutput.ts";
import type { Config } from "./types.ts";

export async function getCurrentConfig() {
  const { stdout } = await execa`${YC_PATH} config list`;
  return parseKeyValueOutput(stdout) as unknown as Config;
}
