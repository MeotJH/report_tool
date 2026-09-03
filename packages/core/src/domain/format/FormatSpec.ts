/**
 * 값 포맷 설정을 JSON으로 안전하게 저장하고 종류별 옵션을 타입으로 구분한다.
 */
export type FormatSpec =
  | { kind: "text" }
  | { kind: "currency"; currency: "KRW" | "USD"; showSymbol?: boolean }
  /**
   * 숫자 표시다. `suffix`는 값 뒤에 붙는 단위다.
   *
   * 단위를 여기 두는 이유는, 그것 없이는 `5.5시간`과 `25.1%`를 양식이 말할 수
   * 없기 때문이다. 호스트가 문자열로 만들어 보내면 되지만, 그러면 같은 값이
   * 화면에서는 숫자로 정렬되지 않고 합계도 낼 수 없다.
   */
  | { kind: "number"; decimals?: number; thousands?: boolean; suffix?: string }
  | { kind: "date"; pattern: string }
  | { kind: "mask"; keepHead?: number; keepTail?: number; maskChar?: string }
  | { kind: "percent"; decimals?: number };
