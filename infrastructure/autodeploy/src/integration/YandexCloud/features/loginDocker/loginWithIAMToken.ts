import { execa } from "execa";

export async function loginWithIAMToken({ token }: { token: string }) {
  await execa("sh", [
    "-c",
    `echo ${token} | docker login --username iam --password-stdin cr.yandex`,
  ]);
}
