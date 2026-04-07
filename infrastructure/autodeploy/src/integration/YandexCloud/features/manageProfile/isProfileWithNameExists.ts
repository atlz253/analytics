import { execa, ExecaError } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function isProfileWithNameExists(name: string) {
  try {
    await execa`${YC_PATH} config profile get ${name}`;
    return true;
  } catch (error) {
    if (
      error instanceof ExecaError &&
      String(error.stderr).includes(`ERROR: unknown profile '${name}'`)
    ) {
      return false;
    } else {
      throw error;
    }
  }
}
