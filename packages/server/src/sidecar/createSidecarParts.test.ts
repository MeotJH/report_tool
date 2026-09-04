import { describe, expect, it } from "vitest";
import { createSidecarParts } from "./createSidecarParts.js";

describe("createSidecarParts", () => {
  it("호스트 주소 하나로 필요한 어댑터를 다 채운다", () => {
    const parts = createSidecarParts(config());

    expect(Object.keys(parts.deps).sort()).toEqual([
      "authAdapter", "dataProvider", "documentStore", "hashProvider", "storage", "templateStore",
    ]);
  });

  it("렌더러는 채우지 않는다. 그것만 호스트가 만들어 합친다", () => {
    const parts = createSidecarParts(config());

    expect("renderer" in parts.deps).toBe(false);
    expect(parts.fontProvider).toBeDefined();
    expect(parts.imageProvider).toBeDefined();
  });

  it("설정한 열쇠로 서명한 토큰이 그대로 검증된다", async () => {
    const { deps } = createSidecarParts(config());

    const token = await deps.authAdapter.issueToken("doc-1", "emp-1", 60);

    expect(await deps.authAdapter.verifyToken(token))
      .toEqual({ documentId: "doc-1", recipientId: "emp-1" });
  });

  it("다른 사이드카가 만든 토큰은 받지 않는다", async () => {
    const mine = createSidecarParts(config());
    const other = createSidecarParts({ ...config(), tokenSecret: "다른열쇠" });

    const forged = await other.deps.authAdapter.issueToken("doc-1", "emp-1", 60);

    await expect(mine.deps.authAdapter.verifyToken(forged)).rejects.toThrow();
  });

  it("해시는 도메인이 받는 모양으로 나온다", async () => {
    const { deps } = createSidecarParts(config());

    expect(await deps.hashProvider.sha256(new Uint8Array([1, 2, 3]))).toMatch(/^[0-9a-f]{64}$/);
  });

  it("열쇠를 주지 않으면 아예 시작하지 못하게 한다", () => {
    expect(() => createSidecarParts({ ...config(), tokenSecret: "" }))
      .toThrow("사이드카 토큰 열쇠가 없다");
  });

  it("호스트 주소를 주지 않으면 아예 시작하지 못하게 한다", () => {
    expect(() => createSidecarParts({ ...config(), host: { baseUrl: "" } }))
      .toThrow("호스트 주소가 없다");
  });
});

/** 시험용 사이드카 설정이다. */
function config(): Parameters<typeof createSidecarParts>[0] {
  return {
    host: { baseUrl: "https://hr.example.com/report-api" },
    tokenSecret: "사이드카-비밀열쇠",
    fontDir: "/fonts",
  };
}
