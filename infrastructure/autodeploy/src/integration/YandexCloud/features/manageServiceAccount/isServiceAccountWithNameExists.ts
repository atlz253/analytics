import { execa, ExecaError } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function isServiceAccountWithNameExists(name: string) {
  try {
    await execa`${YC_PATH} iam service-account get ${name}`;
    return true;
  } catch (error) {
    if (
      error instanceof ExecaError &&
      String(error.stderr).includes(
        `ERROR: service-account with id or name "${name}" not found`,
      )
    ) {
      return false;
    } else {
      throw error;
    }
  }
}
