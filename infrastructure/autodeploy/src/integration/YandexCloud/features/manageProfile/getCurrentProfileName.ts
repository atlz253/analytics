import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function getCurrentProfileName() {
  const { stdout } = await execa`${YC_PATH} config profile list`;

  const activeLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /\bACTIVE\b/.test(line));

  if (!activeLine) {
    throw new Error("Active Yandex Cloud profile not found");
  }

  const result = activeLine.split(/\s+/)[0];

  if (!result) {
    throw new Error("Active Yandex Cloud profile not found");
  }

  return result;
}
