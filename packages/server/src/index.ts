export { createMiddleware } from "./infrastructure/createMiddleware.js";
export type { MiddlewareDeps, MiddlewareOptions } from "./infrastructure/createMiddleware.js";
export { Router } from "./infrastructure/Router.js";
export { toNodeHandler } from "./infrastructure/toNodeHandler.js";
export type { NodeHandler } from "./infrastructure/toNodeHandler.js";
export type { Handler } from "./infrastructure/Router.js";

// 호스트가 Node가 아닐 때(Spring·Flask 등) 쓰는 어댑터다. 사이드카가 이것들로
// 호스트 REST를 부른다 — 급여 DB도 파일 저장소도 사이드카는 모른다.
export { HostApi } from "./adapters/HostApi.js";
export type { HostApiOptions } from "./adapters/HostApi.js";
export { HttpDataProvider } from "./adapters/HttpDataProvider.js";
export { HttpDocumentStore } from "./adapters/HttpDocumentStore.js";
export { HttpImageProvider } from "./adapters/HttpImageProvider.js";
export { HttpStorageAdapter } from "./adapters/HttpStorageAdapter.js";
export { HttpTemplateStore } from "./adapters/HttpTemplateStore.js";
export { NodeCryptoHashProvider } from "./adapters/NodeCryptoHashProvider.js";
export { NodeFontProvider } from "./adapters/NodeFontProvider.js";
export { TokenAuthAdapter } from "./adapters/TokenAuthAdapter.js";

// 호스트가 Node가 아닐 때 사이드카 한 대를 세우는 조립부다.
export { createSidecarParts } from "./sidecar/createSidecarParts.js";
export type { SidecarConfig, SidecarParts } from "./sidecar/createSidecarParts.js";
