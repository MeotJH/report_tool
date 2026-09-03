import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthAdapter } from "@report-tool/core";

/** 토큰 안에 담기는 내용이다. 서명은 이 JSON 위에 걸린다. */
interface TokenPayload {
  readonly documentId: string;
  readonly recipientId: string;
  readonly exp: number;
}

/**
 * 배포 링크 토큰을 HMAC으로 직접 서명하는 참조 구현이다.
 *
 * **프로덕션 코드가 아니다.** 실제 서비스에서는 호스트가 자기 인증(JWT·세션·사내
 * SSO)으로 같은 인터페이스를 구현한다.
 *
 * JWT 라이브러리를 넣지 않았다. 필요한 것은 "이 문서·이 수신자·이 시각까지"
 * 세 값을 위조 없이 나르는 것뿐이고, 그것은 HMAC 한 줄이다. 의존성을 하나 줄이면
 * 그 라이브러리의 취약점 공지를 따라다닐 일도 하나 줄어든다.
 *
 * 토큰은 `base64url(payload).hex(signature)` 꼴이다.
 */
export class TokenAuthAdapter implements AuthAdapter {
  /** 서명 열쇠다. 실제 서비스에서는 환경 변수에서 온다. */
  constructor(private readonly secret: string) {}

  /** 문서·수신자·만료 시각을 서명해 링크에 담을 문자열로 만든다. */
  async issueToken(
    documentId: string,
    recipientId: string,
    ttlSeconds: number,
  ): Promise<string> {
    const payload: TokenPayload = {
      documentId,
      recipientId,
      exp: Date.now() + ttlSeconds * 1000,
    };
    const encoded = TokenAuthAdapter.encode(JSON.stringify(payload));
    return `${encoded}.${this.sign(encoded)}`;
  }

  /**
   * 서명과 기한을 확인하고 문서·수신자를 돌려준다.
   *
   * 서명을 먼저 본다. 내용을 먼저 읽으면 위조된 토큰의 내용으로 판단하게 된다.
   */
  async verifyToken(token: string): Promise<{ documentId: string; recipientId: string }> {
    const [encoded, signature] = token.split(".");
    if (encoded === undefined || signature === undefined || encoded === "" || signature === "") {
      throw new Error("토큰 모양이 아니다");
    }
    if (!this.matches(encoded, signature)) throw new Error("토큰 서명이 맞지 않는다");
    const payload = JSON.parse(TokenAuthAdapter.decode(encoded)) as TokenPayload;
    if (payload.exp <= Date.now()) throw new Error("토큰 기한이 지났다");
    return { documentId: payload.documentId, recipientId: payload.recipientId };
  }

  /**
   * 서명을 글자 단위로 비교하지 않는다.
   *
   * 앞에서부터 다른 자리를 찾는 비교는 맞는 글자 수만큼 오래 걸린다. 그 시간
   * 차이를 재면 서명을 한 글자씩 맞춰 나갈 수 있다.
   */
  private matches(encoded: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(encoded), "utf-8");
    const actual = Buffer.from(signature, "utf-8");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  /** 내용에 열쇠를 섞어 서명한다. */
  private sign(encoded: string): string {
    return createHmac("sha256", this.secret).update(encoded).digest("hex");
  }

  /** URL에 그대로 실을 수 있는 형태로 만든다. */
  private static encode(text: string): string {
    return Buffer.from(text, "utf-8").toString("base64url");
  }

  /** 실어 온 문자열을 원래 내용으로 되돌린다. */
  private static decode(encoded: string): string {
    return Buffer.from(encoded, "base64url").toString("utf-8");
  }
}
