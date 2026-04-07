import { execa } from "execa";

export async function pushImage({
  tag,
  token,
}: {
  tag: string;
  token: string;
}) {
  await execa(
    "skopeo",
    [
      "copy",
      `docker-daemon:${tag}`,
      `docker://${tag}`,
      "--dest-creds",
      `iam:${token}`,
      "--multi-arch",
      "all",
      "--retry-times",
      "3",
      "--retry-delay",
      "5s",
    ],
    { stdio: "inherit" },
  );
}
