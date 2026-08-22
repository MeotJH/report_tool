import { ValueFormatter } from "./ValueFormatter.js";

/**
 * 급여와 공제액을 지정한 통화의 천 단위 표기와 기호로 일관되게 표시한다.
 */
export class CurrencyFormatter extends ValueFormatter {
  /** 통화 종류와 기호 표시 여부를 하나의 교체 가능한 전략으로 고정한다. */
  constructor(
    private readonly currency: "KRW" | "USD",
    private readonly showSymbol: boolean = true,
  ) {
    super();
  }

  /** 숫자로 해석할 수 있는 값만 안전하게 통화 문자열로 변환한다. */
  format(rawValue: unknown): string {
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      return "";
    }

    const formattedValue = numericValue.toLocaleString("ko-KR");
    if (!this.showSymbol) {
      return formattedValue;
    }

    return this.currency === "KRW"
      ? `${formattedValue}원`
      : `$${formattedValue}`;
  }
}
