import { SESSION_COOKIE } from "../../../../lib/session";

/** 쿠키를 지워 로그아웃한다. */
export async function POST(): Promise<Response> {
  return new Response(JSON.stringify({}), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}
