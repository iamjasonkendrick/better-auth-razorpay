import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts", "./src/client.ts", "./src/react.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: [
    "better-auth",
    "better-call",
    "@better-fetch/fetch",
    "razorpay",
    "@tanstack/react-query",
    "react",
  ],
  sourcemap: true,
  outExtension() {
    return {
      js: `.js`,
    };
  },
});
