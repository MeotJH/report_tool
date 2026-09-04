import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * 데모를 한 번에 띄운다.
 *
 * 사이드카와 데모 호스트는 **따로 도는 두 프로세스**다. 그것이 이 제품의 구조라서
 * 합칠 수 없다 — 호스트가 Spring이나 Flask일 수 있고, 그때도 사이드카는 그 옆에서
 * 따로 돈다.
 *
 * 그렇다고 사람이 매번 환경변수 네 개를 손으로 늘어놓아야 할 이유는 없다. 한 줄을
 * 잘못 치면 증상은 "한글이 빈칸으로 나온다"거나 "발행만 안 된다"로 나타나고,
 * 원인이 오타라는 것을 알아채기까지 한참 걸린다. 그래서 이 파일이 대신 친다.
 *
 * 실제 배포에서 쓸 것은 아니다. 그때는 [apps/sidecar/README.md]를 본다.
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** 사이드카가 도는 자리다. 호스트의 프록시도 같은 값을 본다. */
const SIDECAR_PORT = "8787";

/** 데모 호스트가 도는 자리다. */
const HOST_PORT = "3100";

/**
 * PDF에 박아 넣을 한글 폰트가 있는 자리다.
 *
 * 절대 경로로 넘긴다. 상대 경로는 어느 폴더에서 실행했는지에 따라 달라지고,
 * 못 찾았을 때 증상이 "한글이 빈칸"이라 원인을 짚기 어렵다.
 */
const FONT_DIR = join(
  root, "node_modules", "pretendard", "dist", "public", "static", "alternative",
);

const started = [];

void main();

/** 두 프로세스를 띄우고 주소를 알려 준다. */
async function main() {
  if (!checkBuilt()) return;
  if (!await checkPortsFree()) return;
  warnIfNoFonts();

  start("사이드카", process.execPath, [join(root, "apps", "sidecar", "dist", "main.js")], {
    HOST_API_URL: `http://127.0.0.1:${HOST_PORT}/api/report-api`,
    LINK_TOKEN_SECRET: "demo-secret",
    PORT: SIDECAR_PORT,
    FONT_DIR,
  });

  start("호스트", process.execPath, [
    join(root, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", HOST_PORT,
  ], { SIDECAR_URL: `http://127.0.0.1:${SIDECAR_PORT}/report` }, join(root, "apps", "demo-host"));

  announce();
  process.on("SIGINT", stopAll);
}

/**
 * 쓸 포트가 비어 있는지 먼저 본다.
 *
 * 이미 물려 있으면 Node가 `EADDRINUSE` 스택을 스무 줄 뱉는다. 데모를 처음 띄우는
 * 사람에게 그것은 "무엇이 잘못됐는지 모르겠다"와 같다. 앞서 띄운 데모가 아직
 * 살아 있는 경우가 대부분이므로, 무엇을 하면 되는지까지 적는다.
 */
async function checkPortsFree() {
  const busy = [];
  for (const port of [SIDECAR_PORT, HOST_PORT]) {
    if (!await isFree(Number(port))) busy.push(port);
  }
  if (busy.length === 0) return true;
  console.error("");
  console.error(`포트 ${busy.join(", ")}를 이미 다른 프로그램이 쓰고 있습니다.`);
  console.error("앞서 띄운 데모가 아직 살아 있을 수 있습니다.");
  console.error("그 터미널에서 Ctrl+C 하거나, 아래를 실행하세요:");
  console.error("");
  for (const port of busy) {
    console.error(`  npx kill-port ${port}`);
  }
  console.error("");
  process.exitCode = 1;
  return false;
}

/**
 * 포트 하나를 실제로 잡아 보고 바로 놓는다. 묻는 것보다 확실하다.
 *
 * 주소를 지정하지 않는다. 두 서버가 그렇게 잡기 때문이다 — `0.0.0.0`으로 물어보면
 * IPv6(`::`)를 쥐고 있는 프로세스를 놓치고, 검사를 통과한 뒤 `EADDRINUSE`로 죽는다.
 * 검사는 검사받을 대상과 같은 방식이어야 의미가 있다.
 */
function isFree(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port);
  });
}

/** 빌드하지 않은 채 실행하면 무엇을 해야 하는지 알려 주고 멈춘다. */
function checkBuilt() {
  if (existsSync(join(root, "apps", "sidecar", "dist", "main.js"))) return true;
  console.error("먼저 빌드해야 합니다:\n\n  npm install\n  npm run build\n");
  process.exitCode = 1;
  return false;
}

/** 폰트가 없으면 발행본의 한글이 빈칸으로 나온다. 미리 말해 준다. */
function warnIfNoFonts() {
  if (existsSync(FONT_DIR)) return;
  console.warn(`⚠ 한글 폰트를 찾지 못했습니다: ${FONT_DIR}`);
  console.warn("  발행본 PDF의 한글이 빈칸으로 나옵니다. `npm install`을 먼저 하세요.\n");
}

/** 프로세스 하나를 띄우고 출력 앞에 누구 것인지 붙인다. */
function start(name, command, args, env, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  prefix(name, child.stdout);
  prefix(name, child.stderr);
  child.on("exit", (code) => {
    console.log(`[${name}] 종료 (code ${code})`);
    stopAll();
  });
  started.push(child);
}

/** 두 프로세스의 출력이 섞여도 어느 쪽 것인지 알 수 있게 한다. */
function prefix(name, stream) {
  let rest = "";
  stream.on("data", (chunk) => {
    const lines = (rest + chunk.toString()).split("\n");
    rest = lines.pop() ?? "";
    for (const line of lines) console.log(`[${name}] ${line}`);
  });
}

/** 어디를 열어야 하는지 한 번에 보여 준다. */
function announce() {
  console.log("");
  console.log("  데모를 띄웁니다. 잠시 뒤 아래 주소를 브라우저에서 여세요.");
  console.log("");
  console.log(`    http://localhost:${HOST_PORT}`);
  console.log("");
  console.log("  1. 양식 설계 → [데모 양식 넣기] → 새로고침 → 편집 → [저장]");
  console.log("  2. 같은 화면에서 [이 양식을 발행 가능으로 표시]");
  console.log("  3. 발행 → 받는 사람 고르고 발행 → 나온 링크 열기");
  console.log("  4. 링크 화면에서 PDF를 보고 서명");
  console.log("");
  console.log("  끝내려면 Ctrl+C.");
  console.log("");
}

/** 하나가 죽으면 나머지도 정리한다. 반쪽만 남으면 증상이 헷갈린다. */
function stopAll() {
  for (const child of started) {
    if (child.exitCode === null) child.kill();
  }
}
