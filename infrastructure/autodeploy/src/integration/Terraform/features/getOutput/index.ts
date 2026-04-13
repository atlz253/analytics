import { execa } from "execa";

export async function output({
  jsonOutput,
  cwd,
}: {
  jsonOutput: boolean;
  cwd?: string;
}) {
  const { stdout } = await execa(
    "terraform",
    ["output", ...(jsonOutput ? ["-json"] : [])],
    { cwd },
  );
  return stdout;
}
