import { defineConfig } from "vite";

/** React 호스트가 기존 런타임을 재사용하는 ESM 라이브러리 산출물을 만든다. */
export default defineConfig({
  // 개발 서버 포트는 호스트 환경이 정할 수 있게 둔다. 5173이 이미 쓰이는
  // 상황(다른 세션·다른 프로젝트)에서 편집기를 못 띄우는 일을 막는다.
  server: { port: Number(process.env.PORT) || 5173 },
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
