import { describe, expect, it } from "vitest";
import { KoreanParticle } from "./KoreanParticle";

describe("KoreanParticle", () => {
  it("받침이 있으면 을·이를 붙인다", () => {
    expect(KoreanParticle.objectOf("회사명")).toBe("회사명을");
    expect(KoreanParticle.subjectOf("금액")).toBe("금액이");
  });

  it("받침이 없으면 를·가를 붙인다", () => {
    expect(KoreanParticle.objectOf("대표자")).toBe("대표자를");
    expect(KoreanParticle.subjectOf("주소")).toBe("주소가");
  });

  it("한글이 아니면 두 조사를 함께 보여준다", () => {
    expect(KoreanParticle.objectOf("bonus")).toBe("bonus을(를)");
    expect(KoreanParticle.subjectOf("pay.net")).toBe("pay.net이(가)");
  });

  it("빈 이름에도 예외를 던지지 않는다", () => {
    expect(KoreanParticle.objectOf("")).toBe("을(를)");
  });
});
