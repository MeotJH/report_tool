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

  it("단위를 값 뒤에 붙인다", () => {
    expect(new NumberFormatter(1, false, "시간").format(5.5)).toBe("5.5시간");
  });

  it("이미 백분율인 값에 %를 붙일 수 있다", () => {
    expect(new NumberFormatter(1, false, "%").format(25.1)).toBe("25.1%");
  });

  it("단위를 주지 않으면 아무것도 붙이지 않는다", () => {
    expect(new NumberFormatter(1, false).format(5.5)).toBe("5.5");
  });

  it("천 단위 구분과 단위를 함께 쓴다", () => {
    expect(new NumberFormatter(0, true, "원").format(4200000)).toBe("4,200,000원");
  });
});
