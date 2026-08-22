import type { AuthAdapter } from "../port/AuthAdapter.js";
import type { DocumentStore } from "../port/DocumentStore.js";

/** 발행 문서의 수신자에게 제한 시간 접근 토큰을 제공하는 유스케이스다. */
export class DistributionService {
  /** 문서 저장과 인증 기술을 직접 알지 않고 배포 정책만 조율한다. */
  constructor(
    private readonly documentStore: DocumentStore,
    private readonly auth: AuthAdapter,
  ) {}

  /** 취소되지 않은 문서에만 수신자 전용 단기 토큰이 발급되게 한다. */
  async createLink(
    documentId: string,
    ttlSeconds: number = 60 * 60 * 24 * 7,
  ): Promise<string> {
    const document = await this.documentStore.get(documentId);
    if (document.status === "voided") {
      throw new Error("취소된 문서는 배포할 수 없다");
    }

    return this.auth.issueToken(documentId, document.recipientId, ttlSeconds);
  }
}
