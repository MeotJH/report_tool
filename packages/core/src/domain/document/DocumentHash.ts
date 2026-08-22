/** 플랫폼에서 계산된 SHA-256 결과가 올바른 형식인지 보장하는 값 객체다. */
export class DocumentHash {
  private readonly hex: string;

  /** 잘못된 해시가 발행 문서와 서명 기록으로 들어오는 것을 생성 시점에 차단한다. */
  constructor(hex: string) {
    if (!/^[0-9a-f]{64}$/.test(hex)) {
      throw new Error("SHA-256 해시는 64자의 소문자 hex여야 한다");
    }

    this.hex = hex;
  }

  /** 객체 주소가 아니라 실제 해시값을 기준으로 같은 문서인지 비교한다. */
  equals(other: DocumentHash): boolean {
    return this.hex === other.hex;
  }

  /** 저장이나 전송 계층이 검증된 원본 hex 문자열을 사용할 수 있게 한다. */
  toHex(): string {
    return this.hex;
  }
}
