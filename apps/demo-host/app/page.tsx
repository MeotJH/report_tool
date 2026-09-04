/**
 * 데모의 시작점이다. 무엇을 어떤 순서로 해 보면 되는지만 적는다.
 *
 * 처음 여는 사람에게 화면 셋을 동시에 주면 어디부터인지 다시 고르게 만든다.
 */
export default function HomePage() {
  return (
    <div style={{ margin: "0 auto", maxWidth: 720, padding: 24 }}>
      <h1>report-tool 데모 호스트</h1>
      <p style={{ color: "#64748b" }}>
        Next.js 앱이 <strong>호스트</strong> 자리다. 급여 데이터와 양식을 갖고 있고,
        PDF를 만드는 일만 옆의 Node 사이드카에 맡긴다.
      </p>

      <ol style={{ lineHeight: 2 }}>
        <li><a href="/design">양식 설계</a> — 편집기로 양식을 만들고 <strong>저장 → 발행 표시</strong></li>
        <li><a href="/issue">발행</a> — 받는 사람을 골라 발행하고 수신자 링크를 받는다</li>
        <li>링크 열기 — 수신자가 문서를 보고 그 자리에서 서명한다</li>
      </ol>

      <h2 style={{ fontSize: 16, marginTop: 32 }}>먼저 사이드카를 띄워 두세요</h2>
      <pre style={{ background: "#0f172a", borderRadius: 8, color: "#cbd5e1", overflow: "auto", padding: 12 }}>
{`npm run build
HOST_API_URL=http://127.0.0.1:3100/api/report-api \
LINK_TOKEN_SECRET=demo-secret \
FONT_DIR=./node_modules/pretendard/dist/public/static/alternative \
node apps/sidecar/dist/main.js`}
      </pre>
      <p style={{ color: "#64748b", fontSize: 13 }}>
        사이드카는 호스트를 <code>HOST_API_URL</code>로 되부른다. 그 자리가 이 앱의{" "}
        <code>/api/report-api</code>이고, 편집기가 양식을 저장하는 자리와 같다.
      </p>
    </div>
  );
}
