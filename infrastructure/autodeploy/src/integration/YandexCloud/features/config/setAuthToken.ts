import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function setAuthToken(token: string) {
  await execa`${YC_PATH} config set token ${token}`;
}
