import { ValueFormatter } from "./ValueFormatter.js";

/**
 * 날짜 값을 실행 환경의 지역 설정에 의존하지 않는 문서용 패턴으로 표시한다.
 */
export class DateFormatter extends ValueFormatter {
  /** 템플릿이 요구하는 날짜 표현을 포맷 전략에 고정한다. */
  constructor(private readonly pattern: string) {
    super();
  }

  /** 유효한 문자열 날짜만 UTC 기준의 안정적인 결과로 변환한다. */
  format(rawValue: unknown): string {
    if (typeof rawValue !== "string") {
      return "";
    }

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return this.applyPattern(date);
  }

  /** 지원 범위를 연·월·일 토큰으로 제한해 환경별 날짜 포맷 차이를 막는다. */
  private applyPattern(date: Date): string {
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return this.pattern
      .replaceAll("YYYY", year)
      .replaceAll("MM", month)
      .replaceAll("DD", day);
  }
}
