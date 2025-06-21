const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

if (process.argv.length < 4) {
  console.log(
    "Usage: node zip-cli.js <output_path> <input_path1> [<input_path2> ...]"
  );
  process.exit(1);
}

const outputPath = process.argv[2];
const inputPaths = process.argv.slice(3);

if (inputPaths.length === 0) {
  console.error("At least one input path must be provided.");
  process.exit(1);
}

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const output = fs.createWriteStream(outputPath);
const archive = archiver("zip", { zlib: { level: 9 } });

archive.on("error", function (err) {
  throw err;
});

archive.pipe(output);

inputPaths.forEach((inputPath) => {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input path does not exist: ${inputPath}`);
    return;
  }
  const stats = fs.statSync(inputPath);
  if (stats.isDirectory()) {
    const relativePath = path.relative(process.cwd(), inputPath);
    archive.directory(inputPath, relativePath);
  } else if (stats.isFile()) {
    archive.file(inputPath, { name: path.basename(inputPath) });
  } else {
    console.error(`Unsupported input: ${inputPath}`);
  }
});

archive.finalize();
