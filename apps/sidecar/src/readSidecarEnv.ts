import type { SidecarConfig } from "@report-tool/server";

/** 사이드카를 띄우는 데 필요한 전부다. 설정 파일 대신 환경 변수로 받는다. */
export interface SidecarEnvConfig extends SidecarConfig {
  /** 이 프로세스가 들을 포트다. */
  readonly port: number;

  /** 호스트가 이 사이드카를 붙여 둔 자리다. 예: `/report`. */
  readonly basePath: string;
}

/**
 * 환경 변수에서 사이드카 설정을 읽는다.
 *
 * 설정 파일 대신 환경 변수를 쓰는 이유는, 이 프로세스가 컨테이너로 배포되기
 * 때문이다. 파일을 쓰면 이미지 안에 열쇠가 들어가거나 볼륨을 하나 더 마운트해야
 * 한다.
 *
 * **빠진 값은 뜨기 전에 막는다.** 링크 서명 열쇠가 빈 채로 뜨면 아무나 만든 토큰이
 * 통과하고, 그 사실은 사고가 난 뒤에야 드러난다. 늦게 죽는 것보다 아예 뜨지 않는
 * 편이 낫다 — 배포가 실패하면 사람이 본다.
 */
export function readSidecarEnv(env: Record<string, string | undefined>): SidecarEnvConfig {
  const baseUrl = required(env, "HOST_API_URL");
  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error("환경 변수 HOST_API_URL은 http:// 또는 https://로 시작해야 한다");
  }
  const hostKey = optional(env, "HOST_API_KEY");
  return {
    host: {
      baseUrl,
      ...(hostKey === undefined ? {} : { headers: { Authorization: `Bearer ${hostKey}` } }),
    },
    tokenSecret: required(env, "LINK_TOKEN_SECRET"),
    fontDir: optional(env, "FONT_DIR") ?? "./fonts",
    port: readPort(env),
    basePath: withLeadingSlash(optional(env, "BASE_PATH") ?? "/report"),
  };
}

/** 반드시 있어야 하는 값이다. 없으면 이름을 대며 멈춘다. */
function required(env: Record<string, string | undefined>, name: string): string {
  const value = optional(env, name);
  if (value === undefined) throw new Error(`환경 변수 ${name}이 없다`);
  return value;
}

/** 빈 문자열과 공백만 있는 값은 없는 것으로 친다. 배포 스크립트가 자주 그렇게 만든다. */
function optional(env: Record<string, string | undefined>, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}

/** 포트를 읽는다. 숫자가 아니면 무엇이 잘못됐는지 그대로 보여 준다. */
function readPort(env: Record<string, string | undefined>): number {
  const value = optional(env, "PORT");
  if (value === undefined) return 8787;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`환경 변수 PORT가 숫자가 아니다: ${value}`);
  }
  return port;
}

/** 붙일 자리는 슬래시로 시작해야 라우터가 경로를 떼어 낼 수 있다. */
function withLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}
