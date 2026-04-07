import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { parseKeyValueOutput } from "../../utils/output/parseKeyValueOutput.ts";
import type { CatalogInfo } from "./types.ts";

export async function getCatalogInfoByID(id: string) {
  const { stdout } = await execa`${YC_PATH} resource-manager folder get ${id}`;
  return parseKeyValueOutput(stdout) as unknown as CatalogInfo;
}
