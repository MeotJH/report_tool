import { createServer, type Server } from "node:http";
import { PdfDocumentRenderer } from "@report-tool/renderer";
import { createMiddleware, createSidecarParts, toNodeHandler } from "@report-tool/server";
import type { SidecarEnvConfig } from "./readSidecarEnv.js";

/** 컨테이너가 살아 있는지 물어보는 자리다. 붙인 자리 바깥에 둔다. */
const HEALTH_PATH = "/health";

/**
 * 설정 하나로 사이드카 서버를 세운다.
 *
 * 호스트 앱이 Spring이나 Flask라 우리 라이브러리를 `import` 할 수 없을 때, 이
 * 프로세스가 그 옆에서 돈다. 하는 일은 셋이다 — 호스트가 부르면 발행하고, 수신자
 * 브라우저가 부르면 문서를 주고 서명을 받고, 필요한 자료는 호스트에게 되물어본다.
 *
 * **아무것도 오래 들고 있지 않는다.** 급여 DB도 파일 저장소도 모른다. 그래서
 * 재시작해도 잃을 것이 없고, 여러 대로 늘려도 된다(링크 서명 열쇠만 같으면).
 */
export function createSidecarServer(config: SidecarEnvConfig): Server {
  const parts = createSidecarParts(config);
  const middleware = createMiddleware(
    {
      ...parts.deps,
      renderer: new PdfDocumentRenderer(parts.fontProvider, parts.imageProvider),
    },
    { basePath: config.basePath },
  );
  return createServer(toNodeHandler(withHealthCheck(middleware)));
}

/**
 * 살아 있는지 묻는 요청만 가로챈다.
 *
 * 컨테이너 오케스트레이터가 이걸 보고 프로세스를 살릴지 정한다. 붙인 자리
 * (`/report`) 안에 두면 호스트가 자리를 옮길 때마다 검사 주소도 함께 바뀐다.
 */
function withHealthCheck(
  middleware: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (new URL(request.url).pathname === HEALTH_PATH) return new Response("ok");
    return middleware(request);
  };
}
