import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, currentUser } from "./lib/session";

/**
 * 관리 화면을 로그인 뒤로 숨긴다.
 *
 * **수신자 화면(`/sign`)은 막지 않는다.** 문서를 받는 직원은 이 시스템의 계정이
 * 없다. 링크에 든 서명 토큰이 그 사람의 자격이고, 그 검사는 사이드카가 한다.
 * 여기서 로그인을 요구하면 발행한 문서를 아무도 열 수 없다.
 *
 * **API도 막지 않는다.** `/api/report-api`는 사이드카가 서버끼리 부르는 자리라
 * 브라우저 쿠키를 가질 수 없다. 실제 호스트는 여기에 로그인 대신 서버 간 인증
 * (사이드카가 보내는 인증 헤더 확인)을 둔다 — 데모에는 그것이 없다.
 */
export function middleware(request: NextRequest): NextResponse {
  const user = currentUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (user !== null) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

/** 관리 화면만 검사한다. 나머지는 미들웨어를 아예 거치지 않는다. */
export const config = {
  matcher: ["/", "/templates/:path*", "/design/:path*", "/issue"],
};
