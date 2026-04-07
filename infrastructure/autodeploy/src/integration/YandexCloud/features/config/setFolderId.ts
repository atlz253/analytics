import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function setFolderId(id: string) {
  await execa`${YC_PATH} config set folder-id ${id}`;
}
