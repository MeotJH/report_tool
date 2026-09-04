import { describe, expect, it } from "vitest";
import { readSidecarEnv } from "./readSidecarEnv.js";

describe("readSidecarEnv", () => {
  it("필요한 값이 다 있으면 설정이 나온다", () => {
    const config = readSidecarEnv(full());

    expect(config.host.baseUrl).toBe("https://hr.example.com/report-api");
    expect(config.tokenSecret).toBe("link-secret");
    expect(config.fontDir).toBe("/srv/fonts");
  });

  it("호스트 열쇠를 주면 인증 헤더로 만든다", () => {
    const config = readSidecarEnv(full());

    expect(config.host.headers).toEqual({ Authorization: "Bearer host-key" });
  });

  it("호스트 열쇠를 주지 않으면 헤더를 붙이지 않는다", () => {
    const config = readSidecarEnv({ ...full(), HOST_API_KEY: undefined });

    expect(config.host.headers).toBeUndefined();
  });

  it("포트와 붙일 자리에 기본값을 준다", () => {
    const config = readSidecarEnv({ ...full(), PORT: undefined, BASE_PATH: undefined });

    expect(config.port).toBe(8787);
    expect(config.basePath).toBe("/report");
  });

  it("글꼴 폴더에도 기본값을 준다", () => {
    const config = readSidecarEnv({ ...full(), FONT_DIR: undefined });

    expect(config.fontDir).toBe("./fonts");
  });

  it("호스트 주소가 없으면 무엇이 없는지 말한다", () => {
    expect(() => readSidecarEnv({ ...full(), HOST_API_URL: undefined }))
      .toThrow("환경 변수 HOST_API_URL이 없다");
  });

  it("링크 서명 열쇠가 없으면 시작하지 않는다", () => {
    expect(() => readSidecarEnv({ ...full(), LINK_TOKEN_SECRET: undefined }))
      .toThrow("환경 변수 LINK_TOKEN_SECRET이 없다");
  });

  it("빈 문자열도 없는 것으로 친다", () => {
    expect(() => readSidecarEnv({ ...full(), LINK_TOKEN_SECRET: "  " }))
      .toThrow("환경 변수 LINK_TOKEN_SECRET이 없다");
  });

  it("포트가 숫자가 아니면 거절한다", () => {
    expect(() => readSidecarEnv({ ...full(), PORT: "여덟칠팔칠" }))
      .toThrow("환경 변수 PORT가 숫자가 아니다: 여덟칠팔칠");
  });

  it("호스트 주소가 http로 시작하지 않으면 거절한다", () => {
    expect(() => readSidecarEnv({ ...full(), HOST_API_URL: "hr.example.com" }))
      .toThrow("환경 변수 HOST_API_URL은 http:// 또는 https://로 시작해야 한다");
  });

  it("붙일 자리는 슬래시로 시작하게 맞춘다", () => {
    expect(readSidecarEnv({ ...full(), BASE_PATH: "report" }).basePath).toBe("/report");
  });
});

/** 모든 값이 채워진 환경이다. */
function full(): Record<string, string | undefined> {
  return {
    HOST_API_URL: "https://hr.example.com/report-api",
    HOST_API_KEY: "host-key",
    LINK_TOKEN_SECRET: "link-secret",
    FONT_DIR: "/srv/fonts",
    PORT: "9000",
    BASE_PATH: "/report",
  };
}
