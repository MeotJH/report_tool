import type { AuthAdapter } from "../port/AuthAdapter.js";
import type { DocumentStore } from "../port/DocumentStore.js";
import type { StorageAdapter } from "../port/StorageAdapter.js";
import { IssuedDocument } from "../../domain/document/IssuedDocument.js";
import { InvalidTokenError } from "./InvalidTokenError.js";
import {
  SignatureRecord,
  type SignatureRecordOptions,
  type SignatureStroke,
} from "../../domain/document/SignatureRecord.js";

/** 클라이언트가 보낼 수 있는 서명 흔적과 인증 증거만 허용한다. */
export interface SignaturePayload {
  readonly strokes: ReadonlyArray<SignatureStroke>;
  readonly imagePng: string;
  readonly authMethod: SignatureRecordOptions["authMethod"];
  readonly ip?: string;
  readonly userAgent?: string;
}

/** 인증 토큰을 기반으로 문서 조회와 서버 기준 해시의 서명을 접수한다. */
export class SigningService {
  /** 인증·문서·파일 저장 기술을 교체 가능하게 유지하면서 서명 흐름을 조율한다. */
  constructor(
    private readonly documentStore: DocumentStore,
    private readonly auth: AuthAdapter,
    private readonly storage: StorageAdapter,
  ) {}

  /** 조회 이력을 먼저 저장하고 그 문서에 고정된 PDF 바이트를 함께 반환한다. */
  async view(
    token: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ document: IssuedDocument; pdfBytes: Uint8Array }> {
    const { documentId } = await this.verify(token);
    const original = await this.documentStore.get(documentId);
    const document = original.markViewed(original.recipientId, ip, userAgent);
    await this.documentStore.update(document);
    const pdfBytes = await this.storage.get(document.pdf.storageKey);
    return { document, pdfBytes };
  }

  /** 클라이언트 해시를 신뢰하지 않고 서버가 보관한 PDF 해시로 서명을 연결한다. */
  async sign(
    token: string,
    payload: SignaturePayload,
  ): Promise<IssuedDocument> {
    const { documentId, recipientId } = await this.verify(token);
    const document = await this.documentStore.get(documentId);
    const record = this.createSignature(document, recipientId, payload);
    const signed = document.addSignature(record);
    await this.documentStore.update(signed);
    return signed;
  }

  /**
   * 호스트 인증이 어떻게 실패하든 한 가지 종류로 알린다.
   *
   * 호출하는 쪽이 메시지를 뜯어보지 않고도 "토큰 문제"와 "그 밖의 문제"를 나눌 수
   * 있어야 한다. 그래야 만료된 링크에 401을, 내용 문제에 422를 정확히 답한다.
   */
  private async verify(token: string): Promise<{ documentId: string; recipientId: string }> {
    try {
      return await this.auth.verifyToken(token);
    } catch (error) {
      throw InvalidTokenError.from(error);
    }
  }

  /** 서명 대상 해시는 서버 문서에서만 가져오도록 기록 생성을 한곳에 제한한다. */
  private createSignature(
    document: IssuedDocument,
    recipientId: string,
    payload: SignaturePayload,
  ): SignatureRecord {
    return new SignatureRecord({
      signer: "employee",
      signerId: recipientId,
      signedAt: new Date().toISOString(),
      documentHash: document.pdf.sha256,
      ...payload,
    });
  }
}
