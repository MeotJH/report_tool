import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { SESSION_COOKIE, currentUser } from "../../lib/session";
import { ConsoleNav } from "./ConsoleNav";

/**
 * 관리 화면의 껍데기다. 왼쪽 메뉴와 오른쪽 작업 영역으로 나눈다.
 *
 * 편집기와 발행 화면을 이 안에 넣는 이유는, 그것이 이 라이브러리가 실제로 쓰이는
 * 모습이기 때문이다. **편집기는 앱이 아니라 사내 시스템의 한 메뉴다.** 페이지가
 * 각각 떠 있으면 "우리 앱 어디에 넣는가"라는 질문에 답이 되지 않는다.
 *
 * 화면 높이를 여기서 잡아 둔다. 편집기는 자기에게 주어진 자리를 꽉 채우므로,
 * 그 자리를 정하는 것은 언제나 호스트의 몫이다.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const user = currentUser((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <div className="console">
      <ConsoleNav userName={user?.name ?? ""} />
      <main className="console-main">{children}</main>
    </div>
  );
}
