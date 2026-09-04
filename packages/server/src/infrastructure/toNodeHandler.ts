import type { IncomingMessage, ServerResponse } from "node:http";

/** Node 서버 하나가 요청을 넘겨 줄 때 쓰는 모양이다. */
export type NodeHandler = (request: IncomingMessage, response: ServerResponse) => void;

/**
 * 표준 `Request → Response` 핸들러를 Node의 `req/res`에 잇는다.
 *
 * Next.js·Hono·Bun처럼 표준 `Request`를 주는 서버는 `createMiddleware`의 결과를
 * 그대로 붙일 수 있다. 하지만 **순수 Node·Express·NestJS·Fastify는 `req/res`를
 * 준다.** 그 사이를 잇는 스무 줄을 우리가 주지 않으면 호스트마다 각자 짜게 되고,
 * 그러면 본문을 다 못 읽거나 바이너리를 문자열로 만들어 PDF가 깨지는 일이 생긴다.
 * 그 사고는 발행본이 열리지 않는 것으로만 드러난다.
 *
 * 사이드카도 이것을 쓴다 — 사이드카가 곧 순수 Node 서버이기 때문이다.
 */
export function toNodeHandler(handle: (request: Request) => Promise<Response>): NodeHandler {
  return (request, response) => {
    void respond(handle, request, response);
  };
}

/** 요청을 표준 모양으로 바꿔 넘기고, 답을 다시 Node 쪽으로 되돌려 쓴다. */
async function respond(
  handle: (request: Request) => Promise<Response>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const result = await handle(await toStandardRequest(request));
    response.statusCode = result.status;
    result.headers.forEach((value, name) => response.setHeader(name, value));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    // 이유를 삼키지 않는다. 사이드카가 호스트에 닿지 못한 것과 요청이 잘못된 것을
    // 구분하지 못하면, 운영자는 로그를 봐도 어디를 고쳐야 할지 알 수 없다.
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : String(error));
  }
}

/** Node 요청을 표준 `Request`로 옮긴다. */
async function toStandardRequest(request: IncomingMessage): Promise<Request> {
  const method = request.method ?? "GET";
  // 호스트 이름은 요청 헤더에서 온다. 없으면 아무 값이나 넣어도 되는데, `URL`이
  // 절대 주소를 요구하기 때문이다 — 라우터는 경로와 질의만 본다.
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  return new Request(url, {
    method,
    headers: toHeaders(request),
    ...(method === "GET" || method === "HEAD" ? {} : { body: await readBody(request) }),
  });
}

/** Node 헤더 목록을 표준 헤더로 옮긴다. 값이 여럿이면 그대로 여럿으로 넘긴다. */
function toHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    for (const one of Array.isArray(value) ? value : [value]) headers.append(name, one);
  }
  return headers;
}

/**
 * 스트림으로 오는 본문을 한 덩어리로 모은다.
 *
 * `ArrayBuffer`로 돌려주는 이유는 표준 `Request`가 받는 모양이기 때문이다.
 * `Buffer.concat`이 주는 버퍼는 더 큰 풀 위에 얹혀 있을 수 있어, 그 자리만 잘라
 * 낸다 — 그러지 않으면 앞뒤에 남의 바이트가 붙는다.
 */
async function readBody(request: IncomingMessage): Promise<ArrayBuffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);
  return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
}
