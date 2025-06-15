import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22.15",
  outfile: "dist/index.cjs",
  minify: true,
});
