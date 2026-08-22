/** SHA-256 계산을 Node나 브라우저의 구체 암호화 API에서 분리한다. */
export interface HashProvider {
  /** 동일한 PDF인지 검증할 수 있는 소문자 hex 해시의 계산을 위임한다. */
  sha256(bytes: Uint8Array): Promise<string>;
}
