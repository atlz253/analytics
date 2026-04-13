import { execa } from "execa";

export async function apply({
  autoApprove,
  cwd,
}: {
  autoApprove?: boolean;
  cwd?: string;
}) {
  await execa({
    cwd,
    stdio: "inherit",
  })`terraform apply ${autoApprove ? "--auto-approve" : ""}`;
}
