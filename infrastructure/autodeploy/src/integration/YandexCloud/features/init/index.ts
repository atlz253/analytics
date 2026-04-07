import { writeFile } from "node:fs/promises";

import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";
import { INITIALIZATION_FLAG_FILE_NAME } from "./constants/index.ts";

export * from "./isHaveBeenInitialized.ts";

export async function init() {
  await execa({ stdio: "inherit" })`${YC_PATH} init`;
  await writeFile(INITIALIZATION_FLAG_FILE_NAME, "");
}
