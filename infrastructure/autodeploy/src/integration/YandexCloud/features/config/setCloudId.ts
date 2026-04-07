import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function setCloudId(id: string) {
  await execa`${YC_PATH} config set cloud-id ${id}`;
}
