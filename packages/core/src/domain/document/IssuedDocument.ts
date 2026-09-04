import { AuditEntry } from "./AuditEntry.js";
import { DocumentHash } from "./DocumentHash.js";
import { SignatureRecord } from "./SignatureRecord.js";

/** 발행 이후 문서가 거칠 수 있는 상태만 허용한다. */
export type IssuedDocumentStatus = "issued" | "viewed" | "signed" | "voided";

/** 실제 PDF의 저장 위치와 무결성 검증 정보를 한 묶음으로 전달한다. */
export interface IssuedPdf {
  readonly storageKey: string;
  readonly sha256: DocumentHash;
  readonly bytes: number;
}

/** 발행에 필요한 스냅샷을 빠짐없이 이름 기반으로 전달한다. */
export interface IssueDocumentOptions {
  readonly id: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly recipientId: string;
  readonly dataSnapshot: unknown;
  readonly pdf: IssuedPdf;
  readonly issuedAt: string;
  readonly issuedBy: string;
}

/**
 * 저장소에서 문서를 통째로 되살릴 때 쓰는 값이다.
 *
 * `issue()`는 언제나 `issued` 상태의 새 문서를 만든다. 그래서 이것이 없으면
 * **서명된 문서를 DB에서 읽어 올 수 없다** — 상태도 서명도 감사 기록도 되돌릴
 * 방법이 없기 때문이다. 인메모리 저장소는 객체를 그대로 들고 있어서 이 구멍이
 * 가려져 있었다.
 */
export interface IssuedDocumentOptions extends IssueDocumentOptions {
  readonly status: IssuedDocumentStatus;
  readonly signatures: readonly SignatureRecord[];
  readonly auditLog: readonly AuditEntry[];
}

/** 발행 문서의 서명·조회·취소 상태 전이가 정해진 순서로만 일어나도록 강제한다. */
export class IssuedDocument {
  public readonly id: string;
  public readonly templateId: string;
  public readonly templateVersion: number;
  public readonly recipientId: string;
  public readonly status: IssuedDocumentStatus;
  public readonly dataSnapshot: unknown;
  public readonly pdf: IssuedPdf;
  public readonly issuedAt: string;
  public readonly issuedBy: string;
  private readonly signatures: readonly SignatureRecord[];
  private readonly auditLog: readonly AuditEntry[];

  /** 외부에서 임의 상태로 만들지 못하게 하고 검증된 팩터리와 전이 메서드만 사용하게 한다. */
  private constructor(options: IssuedDocumentOptions) {
    this.id = options.id;
    this.templateId = options.templateId;
    this.templateVersion = options.templateVersion;
    this.recipientId = options.recipientId;
    this.status = options.status;
    this.dataSnapshot = options.dataSnapshot;
    this.pdf = { ...options.pdf };
    this.issuedAt = options.issuedAt;
    this.issuedBy = options.issuedBy;
    this.signatures = [...options.signatures];
    this.auditLog = [...options.auditLog];
  }

  /** 모든 발행 문서가 issued 상태와 최초 감사 기록을 갖고 시작하도록 한다. */
  static issue(options: IssueDocumentOptions): IssuedDocument {
    const issueEntry = new AuditEntry({
      at: options.issuedAt,
      actor: options.issuedBy,
      action: "issue",
    });
    return new IssuedDocument({
      ...options,
      status: "issued",
      signatures: [],
      auditLog: [issueEntry],
    });
  }

  /**
   * 저장소에 있던 문서를 상태·서명·감사 기록까지 그대로 되살린다.
   *
   * **저장소 어댑터만 쓴다.** 여기로 임의의 상태를 만들 수 있으므로, 업무 흐름에서
   * 상태를 바꿀 때는 반드시 `markViewed`·`addSignature`·`void`를 거쳐야 한다.
   * 그 전이들이 "취소된 문서는 서명할 수 없다" 같은 규칙을 지키는 자리다.
   */
  static restore(options: IssuedDocumentOptions): IssuedDocument {
    return new IssuedDocument(options);
  }

  /**
   * 저장소에 남길 형태로 바꾼다.
   *
   * `schemaVersion`을 함께 적는다. 발행 문서는 몇 년 뒤에도 읽어야 하는 자료이고,
   * 그때 형식이 바뀌어 있다면 무엇으로 저장된 것인지 알아야 옮길 수 있다.
   */
  toJSON(): Record<string, unknown> {
    return {
      schemaVersion: 1,
      id: this.id,
      templateId: this.templateId,
      templateVersion: this.templateVersion,
      recipientId: this.recipientId,
      status: this.status,
      dataSnapshot: this.dataSnapshot,
      pdf: {
        storageKey: this.pdf.storageKey,
        sha256: this.pdf.sha256.toHex(),
        bytes: this.pdf.bytes,
      },
      issuedAt: this.issuedAt,
      issuedBy: this.issuedBy,
      signatures: this.signatures.map((record) => record.toJSON()),
      auditLog: this.auditLog.map((entry) => entry.toJSON()),
    };
  }

  /** 조회 횟수는 모두 기록하되 최초 조회에서만 문서 상태를 변경한다. */
  markViewed(actor: string, ip?: string, userAgent?: string): IssuedDocument {
    this.assertNotVoided();
    const status = this.status === "issued" ? "viewed" : this.status;
    const entry = new AuditEntry({
      at: new Date().toISOString(),
      actor,
      action: "view",
      ip,
      userAgent,
    });
    return this.copy({ status, auditLog: [...this.auditLog, entry] });
  }

  /** 서명 대상의 해시가 발행 PDF와 같을 때만 서명 상태로 전환한다. */
  addSignature(record: SignatureRecord): IssuedDocument {
    this.assertNotVoided();
    if (!record.documentHash.equals(this.pdf.sha256)) {
      throw new Error("서명 대상 해시가 발행된 문서와 다르다 — 변조 의심");
    }

    const entry = this.createSignatureAuditEntry(record);
    return this.copy({
      status: "signed",
      signatures: [...this.signatures, record],
      auditLog: [...this.auditLog, entry],
    });
  }

  /** 취소 사유를 남기며 이후 조회와 서명을 막는 최종 상태로 전환한다. */
  void(actor: string, reason: string): IssuedDocument {
    if (this.status === "voided") {
      throw new Error("이미 취소된 문서다");
    }

    const entry = new AuditEntry({
      at: new Date().toISOString(),
      actor,
      action: "void",
      meta: { reason },
    });
    return this.copy({ status: "voided", auditLog: [...this.auditLog, entry] });
  }

  /** 호출자가 내부 서명 목록을 바꾸지 못하도록 복사본을 제공한다. */
  getSignatures(): readonly SignatureRecord[] {
    return [...this.signatures];
  }

  /** 호출자가 과거 감사 기록을 지우거나 순서를 바꾸지 못하도록 복사본을 제공한다. */
  getAuditLog(): readonly AuditEntry[] {
    return [...this.auditLog];
  }

  /** 서명 시각과 서명자 정보를 그대로 사용해 서명 감사 기록을 연결한다. */
  private createSignatureAuditEntry(record: SignatureRecord): AuditEntry {
    return new AuditEntry({
      at: record.signedAt,
      actor: record.signerId,
      action: "sign",
      ip: record.ip,
      userAgent: record.userAgent,
    });
  }

  /** 여러 상태 전이가 기존 문서를 보존하는 동일한 복사 규칙을 공유하게 한다. */
  private copy(changes: Partial<IssuedDocumentOptions>): IssuedDocument {
    return new IssuedDocument({
      id: changes.id ?? this.id,
      templateId: changes.templateId ?? this.templateId,
      templateVersion: changes.templateVersion ?? this.templateVersion,
      recipientId: changes.recipientId ?? this.recipientId,
      status: changes.status ?? this.status,
      dataSnapshot: changes.dataSnapshot ?? this.dataSnapshot,
      pdf: changes.pdf ?? this.pdf,
      issuedAt: changes.issuedAt ?? this.issuedAt,
      issuedBy: changes.issuedBy ?? this.issuedBy,
      signatures: changes.signatures ?? this.signatures,
      auditLog: changes.auditLog ?? this.auditLog,
    });
  }

  /** 취소가 최종 상태라는 규칙을 조회와 서명 전이에 동일하게 적용한다. */
  private assertNotVoided(): void {
    if (this.status === "voided") {
      throw new Error("취소된 문서는 변경할 수 없다");
    }
  }
}
