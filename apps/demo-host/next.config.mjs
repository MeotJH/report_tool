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
 * @type {import("next").NextConfig}
 */
const config = {
  transpilePackages: ["@report-tool/designer", "@report-tool/viewer"],
};

export default config;
