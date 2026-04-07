import { execa } from "execa";

import { parseHCL } from "../parseHCL/index.ts";

export async function apply({
  autoApprove,
  cwd,
}: {
  autoApprove?: boolean;
  cwd?: string;
}) {
  const subprocess = execa({
    cwd,
  })`terraform apply ${autoApprove ? "--auto-approve" : ""}`;

  subprocess.stdout.pipe(process.stdout);

  const { stdout } = await subprocess;
  const outputs = stdout.split("Outputs:").at(-1) ?? "";

  return parseHCL(outputs);
}
