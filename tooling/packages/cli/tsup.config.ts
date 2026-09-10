import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    map: "src/bin.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "node20",
  platform: "node",
  dts: { entry: { index: "src/index.ts" } },
  sourcemap: true,
  clean: true,
});
