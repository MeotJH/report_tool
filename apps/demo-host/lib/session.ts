/**
 * 데모의 로그인 상태다.
 *
 * **진짜 인증이 아니다.** 아이디와 비밀번호가 코드에 적혀 있고, 쿠키에는 서명도
 * 만료도 없다. 이것을 그대로 옮겨 쓰면 쿠키 한 줄을 손으로 만들어 넣는 사람에게
 * 남의 급여 데이터가 열린다.
 *
 * 그래도 두는 이유는, 편집기와 발행 화면이 **사내 시스템의 한 메뉴**로 보여야
 * 하기 때문이다. 페이지 세 장이 각각 떠 있으면 "이 라이브러리를 우리 앱 어디에
 * 넣는가"라는 질문에 답이 되지 않는다.
 *
 * 실제 호스트는 이 파일을 지우고 자기 세션을 쓴다. 바꿔야 할 자리는
 * `currentUser` 하나다.
 */

/** 로그인 상태를 담는 쿠키 이름이다. */
export const SESSION_COOKIE = "demo-session";

/** 데모 계정이다. 코드에 적힌 값이라는 것이 곧 이것이 데모라는 표시다. */
const DEMO_ACCOUNT = { id: "admin", password: "admin", name: "인사담당자" } as const;

/** 로그인한 사람이다. 실제 호스트라면 사번과 권한이 함께 온다. */
export interface DemoUser {
  readonly id: string;
  readonly name: string;
}

/** 데모 계정과 맞는지 본다. 맞으면 그 사람을, 아니면 `null`을 준다. */
export function authenticate(id: string, password: string): DemoUser | null {
  if (id !== DEMO_ACCOUNT.id || password !== DEMO_ACCOUNT.password) return null;
  return { id: DEMO_ACCOUNT.id, name: DEMO_ACCOUNT.name };
}

/** 쿠키 값에서 지금 로그인한 사람을 읽는다. 없으면 `null`이다. */
export function currentUser(cookieValue: string | undefined): DemoUser | null {
  if (cookieValue !== DEMO_ACCOUNT.id) return null;
  return { id: DEMO_ACCOUNT.id, name: DEMO_ACCOUNT.name };
}
