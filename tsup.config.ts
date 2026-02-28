import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts", "./src/client.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["better-auth", "better-call", "@better-fetch/fetch", "razorpay"],
  sourcemap: true,
  outExtension() {
    return {
      js: `.js`,
    };
  },
});
