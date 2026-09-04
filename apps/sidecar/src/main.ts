import { createSidecarServer } from "./createSidecarServer.js";
import { readSidecarEnv } from "./readSidecarEnv.js";

/**
 * 사이드카 프로세스의 시작점이다.
 *
 * 하는 일이 셋뿐이다 — 환경 변수를 읽고, 서버를 세우고, 듣는다. 설정이 어긋나면
 * **뜨지 않고 죽는다.** 잘못된 설정으로 떠 있는 것보다 배포가 실패하는 편이 낫다.
 * 떠 있으면 아무도 보지 않지만, 배포가 실패하면 사람이 본다.
 */
function main(): void {
  const config = readSidecarEnv(process.env);
  const server = createSidecarServer(config);

  server.listen(config.port, () => {
    // 열쇠는 찍지 않는다. 컨테이너 로그는 대개 중앙 수집기로 흘러가고, 거기 남은
    // 열쇠는 지울 방법이 없다.
    process.stdout.write(
      `report-tool 사이드카가 ${config.port} 포트에서 대기 중\n`
      + `  호스트   ${config.host.baseUrl}\n`
      + `  붙인 자리 ${config.basePath}\n`
      + `  글꼴     ${config.fontDir}\n`,
    );
  });

  // 컨테이너가 멈추라고 하면 받던 요청까지 끝내고 내려간다. 발행 도중에 끊기면
  // 저장은 됐는데 문서 기록은 없는 상태가 남을 수 있다.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}

main();
