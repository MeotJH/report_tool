/**
 * 서로 다른 값 표시 정책을 호출자가 같은 방식으로 교체해 사용할 수 있게 한다.
 */
export abstract class ValueFormatter {
  /** 원본 값의 종류와 무관하게 문서에 표시할 문자열을 반환하도록 계약한다. */
  abstract format(rawValue: unknown): string;
}
