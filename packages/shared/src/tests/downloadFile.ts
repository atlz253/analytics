import { createWriteStream, unlink } from "node:fs";
import http from "node:http";
import https from "node:https";

export function downloadFile(
  url: string,
  destination: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new URL(url).protocol === "https:" ? https : http;
    const file = createWriteStream(destination);
    client
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
        } else {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(destination);
          });
          file.on("error", (err) => {
            unlink(destination, () => {});
            reject(err);
          });
        }
      })
      .on("error", (error) => reject(error));
  });
}
