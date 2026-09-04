import Link from "next/link";

/**
 * 콘솔의 첫 화면이다. 무엇을 어떤 순서로 해 보면 되는지만 적는다.
 *
 * 처음 여는 사람에게 메뉴만 주면 어디부터인지 다시 고르게 만든다. 이 데모는
 * 순서가 있는 흐름이고, 그 순서를 지키지 않으면 발행이 거절된다.
 */
export default function HomePage() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>급여명세서 발행 시스템</h1>
        <p>
          이 앱이 <strong>호스트</strong>입니다. 급여 데이터와 양식을 직접 갖고 있고,
          PDF를 만드는 일만 옆에서 도는 Node 사이드카에 맡깁니다.
        </p>
      </div>

      <div className="card">
        <ol style={{ lineHeight: 2, margin: 0, paddingLeft: 20 }}>
          <li>
            <Link href="/design">양식 설계</Link> — <strong>데모 양식 넣기</strong>를
            누르고 새로고침한 뒤, 고쳐서 <strong>저장</strong>
          </li>
          <li>같은 화면에서 <strong>이 양식을 발행 가능으로 표시</strong></li>
          <li>
            <Link href="/issue">발행</Link> — 받는 사람을 골라 발행하면 수신자 링크가
            나옵니다
          </li>
          <li>링크를 열면 수신자가 문서를 보고 그 자리에서 서명합니다</li>
        </ol>
      </div>

      <div className="card">
        <p style={{ margin: "0 0 8px" }}><strong>지금 화면에서 무엇이 라이브러리인가</strong></p>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          왼쪽 메뉴·로그인·이 글은 전부 <strong>호스트 앱</strong>이 그린 것입니다.
          라이브러리는 양식 설계 화면의 편집기와 수신자 화면의 뷰어, 둘뿐입니다.
          각자 자기 자리 안에서만 그리고, 저장·발행은 호스트 API를 통해서만 나갑니다
          — 급여 데이터가 고객사 밖으로 나가지 않게 하려는 구조입니다.
        </p>
      </div>

      <p className="notice notice--warn">
        데모입니다. 로그인은 코드에 적힌 계정이고, 저장소는 메모리입니다 —
        서버를 다시 띄우면 사라집니다.
      </p>
    </div>
  );
}
