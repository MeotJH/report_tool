import { describe, expect, it } from "vitest";
import { PercentFormatter } from "./PercentFormatter";



describe("PercentFormatter", () => {
  it("비율을 지정한 소수 자릿수의 퍼센트로 표시한다", () => {
    expect(new PercentFormatter(1).format(0.153)).toBe("15.3%");
  });

  it("숫자로 변환할 수 없으면 빈 문자열로 처리한다", () => {
    const formatter = new PercentFormatter(1);

    expect(formatter.format("abc")).toBe("");
  });
});