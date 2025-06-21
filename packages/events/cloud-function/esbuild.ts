import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["cloud-function/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22.15",
  outfile: "./dist/cloud-function/index.js",
  minify: true,
});
