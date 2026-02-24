import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  format: ["esm"],
  entry: ["./src/index.ts", "./src/client.ts"],
  external: ["better-auth", "better-call", "@better-fetch/fetch", "razorpay"],
  sourcemap: true,
});
