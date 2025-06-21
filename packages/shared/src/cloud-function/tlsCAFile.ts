import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function tlsCAFile() {
  const url = "https://storage.yandexcloud.net/cloud-certs/CA.pem";
  const tlsCAFile = join(tmpdir(), "CA.pem");
  const response = await fetch(url);
  const data = await response.text();
  await writeFile(tlsCAFile, data);
  return tlsCAFile;
}
