import archiver from "archiver";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function zipJSON(objects: { [name: string]: object }): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = tmpdir();
    const archivePath = join(tempDir, randomUUID() + ".zip");
    const output = createWriteStream(archivePath);
    output.on("close", () => resolve(archivePath));
    output.on("error", (err) => reject(err));
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => reject(err));
    archive.on("warning", console.warn);
    archive.pipe(output);
    const archiveCreateTime = new Date();
    Object.keys(objects).forEach((fileName) =>
      archive.append(JSON.stringify(objects[fileName]), {
        name: fileName,
        date: archiveCreateTime,
      })
    );
    archive.finalize();
  });
}
