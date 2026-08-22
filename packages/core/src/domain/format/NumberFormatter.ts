import { ValueFormatter } from "./ValueFormatter.js";

/**
 * 근무시간과 수량을 지정된 소수 자릿수와 천 단위 정책으로 표시한다.
 */
export class NumberFormatter extends ValueFormatter {
  /** 숫자 표시 규칙을 생성 시점에 고정해 호출부의 조건 분기를 없앤다. */
  constructor(
    private readonly decimals: number = 0,
    private readonly thousands: boolean = true,
  ) {
    super();
  }

  /** 숫자로 해석할 수 있는 값에만 지정된 자릿수와 구분자를 적용한다. */
  format(rawValue: unknown): string {
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      return "";
    }

    const fixedValue = numericValue.toFixed(this.decimals);
    return this.thousands ? this.addThousandsSeparators(fixedValue) : fixedValue;
  }

  /** 소수부를 변경하지 않고 정수부에만 천 단위 구분자를 적용한다. */
  private addThousandsSeparators(fixedValue: string): string {
    const [integerPart = "", fractionalPart] = fixedValue.split(".");
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return fractionalPart === undefined
      ? groupedInteger
      : `${groupedInteger}.${fractionalPart}`;
  }
}
