/** 고정 문구와 데이터가 포함된 문구를 저장 형식에서 명확히 구분한다. */
export type Content =
  | { readonly kind: "literal"; readonly value: string }
  | { readonly kind: "template"; readonly value: string };
