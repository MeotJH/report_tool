import { defineConfig } from "vite";

/** 프레임워크가 없는 레거시 호스트를 위해 React까지 포함한 UMD 산출물을 만든다. */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: new URL("./src/index.ts", import.meta.url).pathname,
      formats: ["umd"],
      name: "ReportToolDesigner",
      fileName: () => "designer.standalone.js",
    },
  },
});
