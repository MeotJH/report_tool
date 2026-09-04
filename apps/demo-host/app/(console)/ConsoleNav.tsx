"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 왼쪽 메뉴에 놓을 자리들이다. */
const MENU = [
  { href: "/", label: "홈", icon: "◎" },
  { href: "/design", label: "양식 설계", icon: "✎" },
  { href: "/issue", label: "발행", icon: "▤" },
] as const;

/**
 * 왼쪽 메뉴다. 지금 보고 있는 자리를 표시한다.
 *
 * 편집기가 화면을 꽉 채우면 여기가 유일하게 "다른 데로 갈 수 있다"고 말하는
 * 자리다. 없으면 담당자는 뒤로 가기 말고는 방법이 없다.
 */
export function ConsoleNav(props: { userName: string }) {
  const pathname = usePathname();
  return (
    <nav className="console-nav">
      <div className="console-brand">
        <span className="console-mark">R</span>
        <span>
          <strong>ISU 인사 시스템</strong>
          <em>report-tool 데모</em>
        </span>
      </div>

      <ul className="console-menu">
        {MENU.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={pathname === item.href ? "console-link console-link--on" : "console-link"}
            >
              <span className="console-icon">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="console-foot">
        <span className="console-user">{props.userName}</span>
        <button
          type="button"
          className="console-logout"
          onClick={() => {
            void fetch("/api/auth/logout", { method: "POST" })
              .then(() => { location.href = "/login"; });
          }}
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
