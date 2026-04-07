import { execa } from "execa";

import { YC_PATH } from "../../constants/index.ts";

export async function remove({
  URI,
  recursive,
}: {
  URI: string;
  recursive?: boolean;
}) {
  await execa(
    YC_PATH,
    ["storage", "s3", "rm", URI, ...(recursive ? ["--recursive"] : [])],
    { stdio: "inherit" },
  );
}
