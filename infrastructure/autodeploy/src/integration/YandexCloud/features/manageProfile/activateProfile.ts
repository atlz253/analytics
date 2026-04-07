import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function activateProfile(name: string) {
  await execa`${YC_PATH} config profile activate ${name}`;
}
