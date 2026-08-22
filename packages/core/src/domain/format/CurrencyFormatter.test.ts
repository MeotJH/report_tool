import { describe, expect, it } from "vitest";
import { CurrencyFormatter } from "./CurrencyFormatter";

describe("CurrencyFormatter", () => {
  it("원화 금액에 천 단위 구분과 원 기호를 적용한다", () => {
    expect(new CurrencyFormatter("KRW").format(3_800_000)).toBe("3,800,000원");
  });

  it("원화 금액에 천 단위 구분과 원 기호를 적용한다", () => {
    expect(new CurrencyFormatter("KRW").format(3800000)).toBe("3,800,000원");
  });

  it("달러 금액에 천 단위 구분과 달러 기호를 적용한다", () => {
    expect(new CurrencyFormatter("USD").format(1_200)).toBe("$1,200");
  });

  it("통화 기호를 표시하지 않을 수 있다", () => {
    expect(new CurrencyFormatter("KRW", false).format(1_200)).toBe("1,200");
  });

  it("숫자로 변환할 수 없는 값은 빈 문자열로 처리한다", () => {
    expect(new CurrencyFormatter("KRW").format("abc")).toBe("");
  });
});
