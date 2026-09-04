/**
 * 사이드카를 호스트 뒤에 숨긴다.
 *
 * 수신자 브라우저는 문서를 열고 서명할 때 사이드카를 직접 불러야 한다. 그렇다고
 * **사이드카를 인터넷에 그대로 내놓을 수는 없다** — 그 프로세스는 호스트 콜백 열쇠를
 * 들고 있고, 사내망 안에 있어야 한다.
 *
 * 그래서 호스트가 이 자리를 열어 주고 그대로 넘긴다. 브라우저는 호스트만 알고,
 * 사이드카는 사내망에 남는다. 실제 배포에서는 여기에 rate limit이나 접근 로그를
 * 함께 두면 된다.
 *
 * `SIDECAR_URL`이 없으면 기본값으로 로컬 사이드카를 본다.
 */

/** 사이드카가 도는 자리다. 붙인 자리(`/report`)까지 포함한다. */
function sidecarBase(): string {
  return (process.env["SIDECAR_URL"] ?? "http://127.0.0.1:8787/report").replace(/\/+$/, "");
}

/** 수신자가 문서를 열 때 온다. */
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return relay(request, await context.params);
}

/** 발행·링크 발급·서명 접수가 온다. */
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return relay(request, await context.params);
}

/**
 * 요청을 사이드카로 그대로 넘기고 답을 그대로 돌려준다.
 *
 * 본문을 손대지 않는다. 열람 응답에는 PDF가 base64로 들어 있어, 한 글자만 달라져도
 * 수신자 화면에서 문서가 열리지 않는다.
 */
async function relay(request: Request, params: { path: string[] }): Promise<Response> {
  const url = new URL(request.url);
  const target = `${sidecarBase()}/${params.path.join("/")}${url.search}`;
  try {
    const answer = await fetch(target, {
      method: request.method,
      headers: { "Content-Type": request.headers.get("Content-Type") ?? "application/json" },
      ...(request.method === "GET" ? {} : { body: await request.arrayBuffer() }),
    });
    return new Response(await answer.arrayBuffer(), {
      status: answer.status,
      headers: { "Content-Type": answer.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    // 사이드카가 꺼져 있는 것과 요청이 잘못된 것을 담당자가 구분할 수 있어야 한다.
    const reason = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: `사이드카에 닿지 못했다 (${target}): ${reason}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
