import { ValueFormatter } from "./ValueFormatter.js";

/**
 * 별도 포맷 설정이 없는 값을 손실 없이 기본 문자열로 표시한다.
 */
export class PlainTextFormatter extends ValueFormatter {
  /** 값이 없는 경우만 빈 문자열로 정규화하고 나머지는 원래 문자열 표현을 보존한다. */
  format(rawValue: unknown): string {
    return rawValue === null || rawValue === undefined ? "" : String(rawValue);
  }
}
