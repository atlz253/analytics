import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["k6/*.ts"],
  bundle: true,
  platform: "neutral",
  format: "esm",
  outdir: "./dist",
  minify: true,
  external: ["k6/http", "k6"],
});
