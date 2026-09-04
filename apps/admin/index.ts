export { createDemoTemplate } from "./demo/createDemoTemplate.js";
export { FileSystemStorageAdapter } from "./adapters/FileSystemStorageAdapter.js";
export { InMemoryDocumentStore } from "./adapters/InMemoryDocumentStore.js";
export { InMemoryTemplateStore } from "./adapters/InMemoryTemplateStore.js";
export { StaticJsonDataProvider } from "./adapters/StaticJsonDataProvider.js";

// 아래 셋은 데모용이 아니라 실제 배포에 쓰는 것이라 서버 패키지로 옮겼다.
// 데모가 쓰기 편하도록 여기서 다시 내보낸다.
export {
  NodeCryptoHashProvider,
  NodeFontProvider,
  TokenAuthAdapter,
} from "@report-tool/server";
