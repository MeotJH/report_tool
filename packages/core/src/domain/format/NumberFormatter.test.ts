import { describe, expect, it } from "vitest";
import { NumberFormatter } from "./NumberFormatter";

describe("NumberFormatter", () => {
  it("지정한 소수 자릿수와 천 단위 구분을 적용한다", () => {
    expect(new NumberFormatter(1, true).format(1234.5)).toBe("1,234.5");
  });

  it("천 단위 구분 없이 정수를 표시한다", () => {
    expect(new NumberFormatter(0, false).format(1234)).toBe("1234");
  });

  it("숫자로 변환할 수 없는 값은 빈 문자열로 처리한다", () => {
    expect(new NumberFormatter().format("abc")).toBe("");
  });
});
