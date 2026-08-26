/** Vite가 `?url`로 넘겨주는 파일 경로를 타입 검사가 알게 한다. */
declare module "*.ttf?url" {
  const url: string;
  export default url;
}
