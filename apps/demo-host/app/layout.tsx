import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "ISU 인사 시스템 (report-tool 데모)",
  description: "Next.js 호스트가 편집기·사이드카·수신자 화면을 붙인 예시",
};

/**
 * 앱 전체의 껍데기다. 여기서는 아무것도 그리지 않는다.
 *
 * 화면이 두 종류라서다. 관리 화면은 왼쪽 메뉴가 있는 콘솔(`(console)/layout.tsx`)
 * 안에 들어가고, **수신자 화면(`/sign`)은 그 밖에 있다.** 문서를 받는 직원에게
 * 사내 메뉴를 보여 줄 이유가 없다 — 그 사람은 이 시스템의 계정도 없다.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
