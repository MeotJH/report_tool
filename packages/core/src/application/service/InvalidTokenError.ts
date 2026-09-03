/**
 * 배포 링크 토큰이 통하지 않았다는 사실을 종류로 알린다.
 *
 * 호스트가 어떤 인증을 쓰든(JWT·세션·사내 SSO) 실패는 그쪽 방식대로 던져진다 —
 * `jwt expired`일 수도, 아무 문자열일 수도 있다. 그것을 HTTP 계층이 **메시지로**
 * 판별하면, 호스트를 바꾸는 순간 만료된 링크가 401 대신 422로 답한다. 수신자는
 * "다시 로그인하세요" 대신 "요청이 잘못됐다"는 말을 듣는다.
 *
 * 그래서 토큰 실패만은 종류로 구분한다. 이유는 그대로 들고 간다.
 */
export class InvalidTokenError extends Error {
  /** 호스트가 남긴 이유를 지우지 않는다. 원인을 찾을 유일한 단서다. */
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidTokenError";
  }

  /** 호스트가 무엇을 던지든 이 종류로 감싼다. */
  static from(error: unknown): InvalidTokenError {
    return new InvalidTokenError(error instanceof Error ? error.message : String(error));
  }
}
