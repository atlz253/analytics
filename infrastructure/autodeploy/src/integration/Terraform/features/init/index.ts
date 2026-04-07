import { writeFile } from "node:fs/promises";

import { execa } from "execa";

import { INITIALIZATION_FLAG_FILE_NAME } from "./constants/index.ts";

export * from "./isHaveBeenInitialized.ts";

export async function init({ cwd }: { cwd?: string }) {
  await execa({
    cwd,
  })`terraform init`;
  await writeFile(INITIALIZATION_FLAG_FILE_NAME, "");
}
