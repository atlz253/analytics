import { existsSync } from "node:fs";

import { INITIALIZATION_FLAG_FILE_NAME } from "./constants/index.ts";

export function isHaveBeenInitialized() {
  return existsSync(INITIALIZATION_FLAG_FILE_NAME);
}
