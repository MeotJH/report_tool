/**
 * 값 포맷 설정을 JSON으로 안전하게 저장하고 종류별 옵션을 타입으로 구분한다.
 */
export type FormatSpec =
  | { kind: "text" }
  | { kind: "currency"; currency: "KRW" | "USD"; showSymbol?: boolean }
  | { kind: "number"; decimals?: number; thousands?: boolean }
  | { kind: "date"; pattern: string }
  | { kind: "mask"; keepHead?: number; keepTail?: number; maskChar?: string };
