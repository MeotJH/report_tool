/** 경로에서 꺼낸 값과 함께 요청 하나를 처리하는 함수다. */
export type Handler = (
  request: Request,
  params: Readonly<Record<string, string>>,
) => Promise<Response>;

/**
 * 메서드와 경로를 컨트롤러에 이어 주는 가장 작은 라우팅이다.
 *
 * Express 같은 프레임워크를 쓰지 않기로 했다. 호스트가 이미 쓰고 있는 서버가
 * 무엇이든(Next.js·Hono·순수 Node) `Request → Response` 하나로 붙일 수 있어야
 * 하고, 그러려면 우리 쪽이 프레임워크를 고르지 말아야 한다.
 *
 * 이 정도는 직접 만든다 — 실제로 아주 작다.
 */
export class Router {
  private readonly routes: Route[] = [];
  private readonly basePath: string;

  /**
   * 라우터가 붙는 자리를 받는다.
   *
   * 호스트는 이 미들웨어를 `/api/report` 같은 자리에 붙인다. 그때 들어오는 요청의
   * 경로에는 그 앞자리가 그대로 들어 있다(Next.js가 그렇다). 떼지 않으면 등록해 둔
   * `/documents/issue`와 영영 만나지 못하고, 증상은 모든 요청이 404다.
   */
  constructor(basePath = "") {
    this.basePath = basePath.replace(/\/+$/, "");
  }

  /**
   * 경로 하나를 등록한다. `:id` 같은 조각은 값으로 꺼내 준다.
   *
   * **먼저 등록한 것이 이긴다.** `/documents/new`를 `/documents/:id`보다 앞에 두면
   * 그대로 동작한다. 나중 것이 이기면 고정 경로가 변수 경로에 먹혀, 등록해 둔
   * 핸들러가 조용히 불리지 않는다.
   */
  add(method: string, path: string, handler: Handler): void {
    const paramNames: string[] = [];
    const pattern = Router.toPattern(path, paramNames);
    this.routes.push({ method: method.toUpperCase(), pattern, paramNames, handler });
  }

  /** 요청에 맞는 경로를 찾아 넘긴다. 없으면 404다. */
  async handle(request: Request): Promise<Response> {
    const path = this.pathWithoutBase(new URL(request.url).pathname);
    if (path === null) return new Response("Not Found", { status: 404 });
    for (const route of this.routes) {
      if (route.method !== request.method.toUpperCase()) continue;
      const matched = route.pattern.exec(path);
      if (matched === null) continue;
      return route.handler(request, Router.toParams(route.paramNames, matched));
    }
    return new Response("Not Found", { status: 404 });
  }

  /** 붙인 자리를 뗀 경로다. 그 자리 밖에서 온 요청이면 `null`이다. */
  private pathWithoutBase(pathname: string): string | null {
    if (this.basePath === "") return pathname;
    if (!pathname.startsWith(this.basePath)) return null;
    return pathname.slice(this.basePath.length) || "/";
  }

  /**
   * 등록 경로를 정규식으로 바꾸고 변수 이름을 순서대로 모은다.
   *
   * 변수가 아닌 조각은 정규식 특수문자를 막아 둔다. `/health.check`의 점을 그대로
   * 두면 `healthXcheck`도 같은 경로로 잡힌다.
   */
  private static toPattern(path: string, paramNames: string[]): RegExp {
    const body = path
      .split("/")
      .map((segment) => {
        if (!segment.startsWith(":")) return Router.escape(segment);
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      })
      .join("/");
    return new RegExp(`^${body}$`);
  }

  /** 정규식이 특별하게 읽는 글자를 글자 그대로 만든다. */
  private static escape(segment: string): string {
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** 매칭 결과를 이름 붙은 값으로 바꿔 핸들러가 순서를 몰라도 되게 한다. */
  private static toParams(
    paramNames: readonly string[],
    matched: RegExpExecArray,
  ): Record<string, string> {
    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(matched[index + 1] ?? "");
    });
    return params;
  }
}

/** 등록해 둔 경로 하나가 들고 있는 것이다. */
interface Route {
  readonly method: string;
  readonly pattern: RegExp;
  readonly paramNames: readonly string[];
  readonly handler: Handler;
}
