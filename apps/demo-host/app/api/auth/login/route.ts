import { authenticate, SESSION_COOKIE } from "../../../../lib/session";

/**
 * 데모 로그인을 받는다.
 *
 * 쿠키에 서명도 만료도 넣지 않는다 — 데모라서다. 실제 호스트는 여기를 자기
 * 세션 발급으로 갈아 끼운다.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.json() as { id?: string; password?: string };
  const user = authenticate(body.id ?? "", body.password ?? "");
  if (user === null) {
    // 어느 쪽이 틀렸는지 말하지 않는다. 아이디만 맞았다는 사실도 정보다.
    return json({ error: "아이디 또는 비밀번호가 맞지 않습니다." }, 401);
  }
  return new Response(JSON.stringify({ name: user.name }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${SESSION_COOKIE}=${user.id}; Path=/; HttpOnly; SameSite=Lax`,
    },
  });
}

/** 실패를 같은 모양으로 돌려준다. */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
