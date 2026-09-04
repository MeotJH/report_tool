/**
 * 데모 호스트 설정이다.
 *
 * `.ts`가 아니라 `.mjs`인 이유는, 이 저장소가 TypeScript 7을 쓰는데 Next 15의
 * TS 설정 로더가 그것을 읽지 못하기 때문이다(`Cannot read properties of undefined`).
 * 설정 파일 하나 때문에 저장소 전체의 TypeScript 판을 내릴 이유는 없다.
 *
 * 편집기와 뷰어는 워크스페이스 패키지로 들어오므로 Next가 함께 변환하게 둔다.
 * 실제 호스트라면 npm에서 받은 패키지라 이 설정이 필요 없다.
 *
 * **`core`와 `admin`은 서버에서 번들하지 않는다.** Next는 라우트마다 서버 번들을
 * 따로 만든다. 그래서 core를 함께 묶으면 `/api/demo/seed`가 만든 요소와
 * `/api/report-api/…`가 아는 클래스가 **서로 다른 복사본**이 되고,
 * `element instanceof FieldElement`가 조용히 거짓이 된다. 같은 소스라도 로드된
 * 모듈이 다르면 다른 클래스다.
 *
 * 실제로 그렇게 됐고, 증상은 "데이터 명세가 텅 비어 있다"였다. 예외도 로그도
 * 나지 않는다. 라이브러리는 Visitor로 요소 종류를 가르므로 이 사고가 나면
 * **요소를 하나도 알아보지 못한다.**
 *
 * `serverExternalPackages`로 빼면 Node가 한 번만 불러오고 프로세스 전체가 같은
 * 클래스를 쓴다. 이 라이브러리를 Next 호스트에 붙이는 곳은 모두 같은 설정이
 * 필요하다.
 *
 * @type {import("next").NextConfig}
 */
const config = {
  serverExternalPackages: ["@report-tool/core", "@report-tool/admin"],
  transpilePackages: ["@report-tool/designer", "@report-tool/viewer"],
};

export default config;
