/**
 * Vite가 파일 주소를 문자열로 넘겨 주는 `?url` 수입 형태를 타입 검사에 알린다.
 *
 * pdf.js 작업자 파일이 어디에 놓이는지는 번들러가 정하므로, 그 주소를 코드에
 * 박지 않고 번들러에게 묻는다.
 */
declare module "*?url" {
  const url: string;
  export default url;
}
