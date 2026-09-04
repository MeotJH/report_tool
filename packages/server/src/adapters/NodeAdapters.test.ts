import { describe, expect, it } from "vitest";
import { NodeCryptoHashProvider } from "./NodeCryptoHashProvider.js";
import { NodeFontProvider } from "./NodeFontProvider.js";
import { TokenAuthAdapter } from "./TokenAuthAdapter.js";

describe("NodeCryptoHashProvider", () => {
  it("널리 알려진 값과 같은 해시를 낸다", async () => {
    const hash = await new NodeCryptoHashProvider().sha256(new TextEncoder().encode("abc"));

    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("소문자 hex 64자로 준다. 도메인이 그 모양만 받는다", async () => {
    const hash = await new NodeCryptoHashProvider().sha256(new Uint8Array([1, 2, 3]));

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("NodeFontProvider", () => {
  it("굵기에 맞는 TTF 파일을 준다", async () => {
    const bytes = await new NodeFontProvider(pretendardDirectory()).load("Pretendard", 700);

    // TrueType 파일은 0x00010000으로 시작한다. OTF(`OTTO`)면 임베딩에서 예외가 난다.
    expect([...bytes.slice(0, 4)]).toEqual([0, 1, 0, 0]);
  });

  it("보통 굵기와 굵은 글씨가 다른 파일이다", async () => {
    const provider = new NodeFontProvider(pretendardDirectory());

    const regular = await provider.load("Pretendard", 400);
    const bold = await provider.load("Pretendard", 700);

    expect(regular.length).not.toBe(bold.length);
  });

  it("없는 글꼴은 무엇을 찾지 못했는지 말한다", async () => {
    await expect(new NodeFontProvider(pretendardDirectory()).load("없는글꼴", 400))
      .rejects.toThrow("글꼴 파일을 찾을 수 없다: 없는글꼴-Regular.ttf");
  });
});

describe("TokenAuthAdapter", () => {
  it("발급한 토큰에서 문서와 수신자가 그대로 나온다", async () => {
    const auth = new TokenAuthAdapter("비밀열쇠");

    const token = await auth.issueToken("doc-1", "emp-1", 60);

    expect(await auth.verifyToken(token)).toEqual({ documentId: "doc-1", recipientId: "emp-1" });
  });

  it("글자 하나만 바꿔도 검증에 실패한다", async () => {
    const auth = new TokenAuthAdapter("비밀열쇠");
    const token = await auth.issueToken("doc-1", "emp-1", 60);

    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    await expect(auth.verifyToken(tampered)).rejects.toThrow("토큰 서명이 맞지 않는다");
  });

  it("다른 열쇠로 만든 토큰은 받지 않는다", async () => {
    const token = await new TokenAuthAdapter("열쇠1").issueToken("doc-1", "emp-1", 60);

    await expect(new TokenAuthAdapter("열쇠2").verifyToken(token))
      .rejects.toThrow("토큰 서명이 맞지 않는다");
  });

  it("기한이 지난 토큰은 받지 않는다", async () => {
    const auth = new TokenAuthAdapter("비밀열쇠");

    const token = await auth.issueToken("doc-1", "emp-1", -1);

    await expect(auth.verifyToken(token)).rejects.toThrow("토큰 기한이 지났다");
  });

  it("모양이 아예 다른 문자열도 조용히 통과하지 않는다", async () => {
    await expect(new TokenAuthAdapter("비밀열쇠").verifyToken("그냥문자열"))
      .rejects.toThrow("토큰 모양이 아니다");
  });
});

/** 저장소에 이미 들어 있는 Pretendard TTF 폴더다. */
function pretendardDirectory(): string {
  return new URL(
    "../../../../node_modules/pretendard/dist/public/static/alternative/",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1");
}
