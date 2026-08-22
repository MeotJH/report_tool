/** 배포 링크 인증 방식을 특정 토큰 라이브러리나 인증 서버에서 분리한다. */
export interface AuthAdapter {
  /** 문서와 수신자에게만 유효한 제한 시간 토큰을 발급하게 한다. */
  issueToken(
    documentId: string,
    recipientId: string,
    ttlSeconds: number,
  ): Promise<string>;

  /** 검증된 토큰에서 접근 가능한 문서와 수신자 식별자를 복원하게 한다. */
  verifyToken(token: string): Promise<{
    documentId: string;
    recipientId: string;
  }>;
}
