import { describe, expect, it } from "vitest";
import { NumberFieldDraft } from "./NumberFieldDraft.js";

describe("NumberFieldDraft", () => {
  it("사람이 손대지 않은 칸은 확정하지 않는다", () => {
    const draft = new NumberFieldDraft();
    expect(draft.resolve(draft.format(1.836), 1.836)).toBeNull();
  });

  it("소수 셋째 자리 값을 보여 줄 때 깎지 않는다", () => {
    const draft = new NumberFieldDraft();
    expect(draft.format(1.836)).toBe("1.836");
  });

  it("끌어서 생긴 부동소수점 꼬리는 화면에 내지 않는다", () => {
    const draft = new NumberFieldDraft();
    expect(draft.format(0.30000000000000004)).toBe("0.3");
  });

  it("사람이 고쳐 쓴 값만 확정한다", () => {
    const draft = new NumberFieldDraft();
    expect(draft.resolve("1.9", 1.836)).toBe(1.9);
  });

  it("숫자가 아니면 확정하지 않는다", () => {
    const draft = new NumberFieldDraft();
    expect(draft.resolve("abc", 10)).toBeNull();
  });

  it("빈 칸은 0으로 확정하지 않는다", () => {
    const draft = new NumberFieldDraft();
    expect(draft.resolve("", 10)).toBeNull();
  });

  it("경계를 벗어난 입력은 경계까지만 확정한다", () => {
    const draft = new NumberFieldDraft(1, 100);
    expect(draft.resolve("0.2", 10)).toBe(1);
    expect(draft.resolve("500", 10)).toBe(100);
  });

  it("경계까지 맞춘 결과가 지금 값과 같으면 확정하지 않는다", () => {
    const draft = new NumberFieldDraft(1, 100);
    expect(draft.resolve("0.2", 1)).toBeNull();
  });
});
