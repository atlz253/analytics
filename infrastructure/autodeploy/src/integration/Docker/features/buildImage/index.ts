import { execa } from "execa";

export async function buildImage({
  cwd,
  dockerFile,
  tag,
  path = ".",
  noCache,
}: {
  cwd?: string;
  dockerFile?: string;
  tag?: string;
  path?: string;
  noCache?: boolean;
} = {}) {
  await execa(
    "docker",
    [
      "build",
      ...(dockerFile ? ["-f", dockerFile] : []),
      ...(tag ? ["-t", tag] : []),
      ...(noCache ? ["--no-cache"] : []),
      "--build-arg", "FORCE_NEW_HASH=1",
      path,
    ],
    {
      cwd,
      stdio: "inherit",
    },
  );
}
