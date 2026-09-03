import {
  DistributionService,
  IssuanceService,
  SigningService,
  type AuthAdapter,
  type DataProvider,
  type DocumentRenderer,
  type DocumentStore,
  type HashProvider,
  type StorageAdapter,
  type TemplateStore,
} from "@report-tool/core";
import { DistributionController } from "../controller/DistributionController.js";
import { IssuanceController } from "../controller/IssuanceController.js";
import { SigningController } from "../controller/SigningController.js";
import { Router } from "./Router.js";

/** 미들웨어를 어디에 붙였는지 알려 주는 값이다. */
export interface MiddlewareOptions {
  /**
   * 이 미들웨어가 붙은 자리다. 예: `/api/report`.
   *
   * 주지 않으면 요청 경로를 그대로 쓴다. Next.js처럼 요청 URL에 마운트 경로가
   * 그대로 들어오는 곳에서는 반드시 줘야 한다 — 없으면 모든 요청이 404다.
   */
  readonly basePath?: string;
}

/**
 * 호스트가 자기 인프라로 채워야 하는 자리다.
 *
 * 글꼴 공급자가 여기 없는 이유는, 그것을 쓰는 것이 렌더러이기 때문이다. 호스트는
 * `new PdfDocumentRenderer(fontProvider, imageProvider)`로 렌더러를 만들어 넘긴다.
 * 여기서 또 받으면 같은 것을 두 번 주게 되고, 서로 다른 것을 주면 어느 쪽이 쓰이는지
 * 호스트가 알 수 없다.
 */
export interface MiddlewareDeps {
  readonly templateStore: TemplateStore;
  readonly documentStore: DocumentStore;
  readonly dataProvider: DataProvider;
  readonly storage: StorageAdapter;
  readonly authAdapter: AuthAdapter;
  readonly renderer: DocumentRenderer;
  readonly hashProvider: HashProvider;
}

/**
 * 어댑터를 넣으면 완성된 요청 핸들러가 나온다. **이 패키지의 유일한 공개 진입점이다.**
 *
 * 반환값이 `(Request) => Promise<Response>` 하나인 이유는, 호스트가 이미 쓰고 있는
 * 서버가 무엇이든 그대로 붙어야 하기 때문이다. Next.js면
 * `export const POST = handler`, Hono면 `app.all('*', c => handler(c.req.raw))`,
 * 순수 Node면 어댑터 몇 줄이다. 우리가 프레임워크를 고르면 그것을 쓰지 않는 회사는
 * 이 라이브러리를 못 쓴다.
 *
 * 서비스 조립도 여기서 한다. 호스트가 `IssuanceService`의 인자 여섯 개 순서를 알아야
 * 한다면, 그것은 라이브러리가 자기 내부를 호스트에게 외우게 한 것이다.
 */
export function createMiddleware(
  deps: MiddlewareDeps,
  options: MiddlewareOptions = {},
): (request: Request) => Promise<Response> {
  const issuance = new IssuanceController(new IssuanceService(
    deps.templateStore, deps.dataProvider, deps.renderer,
    deps.storage, deps.documentStore, deps.hashProvider,
  ));
  const distribution = new DistributionController(
    new DistributionService(deps.documentStore, deps.authAdapter),
  );
  const signing = new SigningController(
    new SigningService(deps.documentStore, deps.authAdapter, deps.storage),
  );

  const router = new Router(options.basePath);
  router.add("POST", "/documents/issue", (request) => issuance.handle(request));
  router.add("GET", "/documents/view", (request) => signing.handleView(request));
  router.add("POST", "/documents/sign", (request) => signing.handleSign(request));
  // 값이 들어가는 경로는 고정 경로보다 뒤에 둔다. 앞에 두면 `/documents/issue`가
  // `:id`로 먹혀 발행 요청이 링크 발급으로 간다.
  router.add("POST", "/documents/:id/link", (request, params) => (
    distribution.handle(request, params)
  ));
  return (request) => router.handle(request);
}
