import { ValueFormatter } from "./ValueFormatter.js";

/**
 * 비율 값을 일정한 소수 자릿수의 퍼센트 문자열로 표시한다.
 */
export class PercentFormatter extends ValueFormatter {
  /** 문서마다 동일한 퍼센트 소수 자릿수를 사용하도록 설정을 고정한다. */
  constructor(private readonly decimals: number = 0) {
    super();
  }

  /** 숫자로 해석할 수 있는 비율만 백분율 문자열로 변환한다. */
  format(rawValue: unknown): string {
    if (rawValue === null || rawValue === undefined) {
      return "";
    }

    const numberValue = Number(rawValue);
    if (Number.isNaN(numberValue)) {
      return "";
    }

    const percentageValue = numberValue * 100;
    return `${percentageValue.toFixed(this.decimals)}%`;
  }
}
