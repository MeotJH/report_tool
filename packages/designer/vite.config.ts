import { defineConfig } from "vite";

/** React 호스트가 기존 런타임을 재사용하는 ESM 라이브러리 산출물을 만든다. */
export default defineConfig({
  build: {
    lib: {
      entry: new URL("./src/index.ts", import.meta.url).pathname,
      formats: ["es"],
      fileName: () => "designer.esm.js",
    },
    rollupOptions: {
      external: [
        "@report-tool/core",
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
      ],
    },
  },
});
