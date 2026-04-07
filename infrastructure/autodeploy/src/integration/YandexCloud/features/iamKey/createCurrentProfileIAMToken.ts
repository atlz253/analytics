import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function createCurrentProfileIAMToken() {
  const { stdout } = await execa`${YC_PATH} iam create-token`;
  return stdout;
}
