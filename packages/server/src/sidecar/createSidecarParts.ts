import type { FontProvider, ImageProvider } from "@report-tool/core";
import { HostApi, type HostApiOptions } from "../adapters/HostApi.js";
import { HttpDataProvider } from "../adapters/HttpDataProvider.js";
import { HttpDocumentStore } from "../adapters/HttpDocumentStore.js";
import { HttpImageProvider } from "../adapters/HttpImageProvider.js";
import { HttpStorageAdapter } from "../adapters/HttpStorageAdapter.js";
import { HttpTemplateStore } from "../adapters/HttpTemplateStore.js";
import { NodeCryptoHashProvider } from "../adapters/NodeCryptoHashProvider.js";
import { NodeFontProvider } from "../adapters/NodeFontProvider.js";
import { TokenAuthAdapter } from "../adapters/TokenAuthAdapter.js";
import type { MiddlewareDeps } from "../infrastructure/createMiddleware.js";

/** 사이드카 한 대를 세우는 데 필요한 전부다. */
export interface SidecarConfig {
  /** 호스트 앱이 report-tool 콜백을 열어 둔 자리와 인증 헤더다. */
  readonly host: HostApiOptions;

  /**
   * 배포 링크 토큰에 서명할 열쇠다.
   *
   * 사이드카를 여러 대 띄운다면 **모두 같은 열쇠**여야 한다. 다르면 A가 만든
   * 링크를 B가 열지 못하고, 그 증상은 수신자에게 "링크가 만료됐다"로 보인다.
   */
  readonly tokenSecret: string;

  /** 발행본에 임베딩할 TTF 파일이 모여 있는 폴더다. 사이드카 안에 둔다. */
  readonly fontDir: string;
}

/** 사이드카가 조립해 준 것들이다. 렌더러만 호스트가 만들어 합친다. */
export interface SidecarParts {
  readonly fontProvider: FontProvider;
  readonly imageProvider: ImageProvider;

  /** 렌더러를 뺀 나머지 의존성이다. 렌더러를 더하면 그대로 미들웨어가 된다. */
  readonly deps: Omit<MiddlewareDeps, "renderer">;
}

/**
 * 설정 하나로 사이드카가 쓸 어댑터를 전부 만든다.
 *
 * 호스트 앱이 Spring이나 Flask라면 `createMiddleware`를 그 안에서 부를 수 없다.
 * 대신 Node 사이드카 한 대를 띄우고, 그것이 호스트를 REST로 부른다. 이 함수가
 * 그 연결을 한 번에 세운다 — 호스트 개발자는 어댑터 여섯 개를 손으로 조립하는
 * 대신 주소와 열쇠만 준다.
 *
 * **렌더러만 빼 둔다.** 여기서 만들면 이 패키지가 pdf-lib를 통째로 끌고 오게 되어,
 * 자기 렌더러를 쓰는 호스트에게까지 그 무게를 물린다. 사이드카 파일에서 한 줄로
 * 합치면 된다:
 *
 * ```ts
 * const parts = createSidecarParts(config);
 * const renderer = new PdfDocumentRenderer(parts.fontProvider, parts.imageProvider);
 * const handler = createMiddleware({ ...parts.deps, renderer }, { basePath: "/report" });
 * ```
 *
 * 설정이 비어 있으면 시작 시점에 막는다. 열쇠가 빈 채로 뜨면 **아무나 만든 토큰이
 * 통과하고**, 그 사실은 사고가 난 뒤에야 드러난다.
 */
export function createSidecarParts(config: SidecarConfig): SidecarParts {
  if (config.tokenSecret === "") throw new Error("사이드카 토큰 열쇠가 없다");
  if (config.host.baseUrl === "") throw new Error("호스트 주소가 없다");
  const api = new HostApi(config.host);
  return {
    fontProvider: new NodeFontProvider(config.fontDir),
    imageProvider: new HttpImageProvider(api),
    deps: {
      templateStore: new HttpTemplateStore(api),
      documentStore: new HttpDocumentStore(api),
      dataProvider: new HttpDataProvider(api),
      storage: new HttpStorageAdapter(api),
      authAdapter: new TokenAuthAdapter(config.tokenSecret),
      hashProvider: new NodeCryptoHashProvider(),
    },
  };
}
