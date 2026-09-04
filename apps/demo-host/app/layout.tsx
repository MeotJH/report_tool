import type { ReactNode } from "react";

export const metadata = {
  title: "report-tool 데모 호스트",
  description: "Next.js 호스트가 편집기·사이드카·수신자 화면을 붙인 예시",
};

/**
 * 데모 호스트의 껍데기다.
 *
 * 실제 호스트라면 여기 사내 네비게이션과 로그인 상태가 들어간다. 편집기와 뷰어는
 * 그 안의 한 자리를 차지할 뿐이다.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "Pretendard, system-ui, sans-serif", background: "#f5f7fb" }}>
        <header style={{
          background: "#fff", borderBottom: "1px solid #e4e9f2", display: "flex",
          gap: 16, padding: "12px 20px",
        }}>
          <strong>ISU 인사 시스템 (데모 호스트)</strong>
          <a href="/design">양식 설계</a>
          <a href="/issue">발행</a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
