import { execa } from "execa";

export async function destroy({
  autoApprove,
  cwd,
}: {
  autoApprove?: boolean;
  cwd?: string;
}) {
  await execa({
    cwd,
    stdio: "inherit",
  })`terraform destroy ${autoApprove ? "--auto-approve" : ""}`;
}
