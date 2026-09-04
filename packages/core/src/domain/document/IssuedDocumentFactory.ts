import { AuditEntry, type AuditAction } from "./AuditEntry.js";
import { DocumentHash } from "./DocumentHash.js";
import { IssuedDocument, type IssuedDocumentStatus, type IssuedPdf } from "./IssuedDocument.js";
import { SignatureRecord, type SignatureRecordOptions } from "./SignatureRecord.js";
import { SignatureStrokeReader } from "./SignatureStrokeReader.js";

/**
 * 저장소에 있던 JSON을 발행 문서로 되돌린다.
 *
 * 이것이 없으면 **호스트는 발행 문서를 DB에 넣을 수는 있어도 꺼낼 수 없다.**
 * `IssuedDocument.issue()`는 언제나 새 문서를 만들기 때문이다. 인메모리 저장소가
 * 객체 참조를 들고 있어서 이 구멍이 오래 가려져 있었다.
 *
 * 읽을 때 형식을 하나씩 확인한다. 발행 문서는 "무엇에 서명했는가"를 증명하는
 * 자료이므로, 어긋난 자료를 조용히 받아들이면 증명이 성립하지 않는 상태로 남는다.
 */
export class IssuedDocumentFactory {
  /** 지금 읽을 수 있는 저장 형식이다. 늘어나면 여기에 더하고 마이그레이션을 붙인다. */
  private static readonly SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1];

  /** 상태 문자열은 이 넷뿐이다. 다른 값은 저장 중에 망가진 것이다. */
  private static readonly STATUSES: readonly string[] = ["issued", "viewed", "signed", "voided"];

  /** 감사 기록의 행위도 정해진 것뿐이다. */
  private static readonly ACTIONS: readonly string[] = ["issue", "view", "sign", "void"];

  /** 저장된 JSON을 상태·서명·감사 기록까지 그대로 되살린다. */
  static fromJSON(json: Record<string, unknown>): IssuedDocument {
    IssuedDocumentFactory.assertSchemaVersion(json["schemaVersion"]);
    return IssuedDocument.restore({
      id: IssuedDocumentFactory.readText(json, "id"),
      templateId: IssuedDocumentFactory.readText(json, "templateId"),
      templateVersion: IssuedDocumentFactory.readNumber(json, "templateVersion"),
      recipientId: IssuedDocumentFactory.readText(json, "recipientId"),
      status: IssuedDocumentFactory.readStatus(json["status"]),
      dataSnapshot: json["dataSnapshot"],
      pdf: IssuedDocumentFactory.readPdf(json["pdf"]),
      issuedAt: IssuedDocumentFactory.readText(json, "issuedAt"),
      issuedBy: IssuedDocumentFactory.readText(json, "issuedBy"),
      signatures: IssuedDocumentFactory.readSignatures(json["signatures"]),
      auditLog: IssuedDocumentFactory.readAuditLog(json["auditLog"]),
    });
  }

  /** 모르는 형식을 짐작해서 읽지 않는다. 짐작이 틀리면 증거가 조용히 바뀐다. */
  private static assertSchemaVersion(value: unknown): void {
    if (!IssuedDocumentFactory.SUPPORTED_SCHEMA_VERSIONS.includes(Number(value))) {
      throw new Error(`지원하지 않는 발행 문서 형식이다: ${String(value)}`);
    }
  }

  /** 저장된 PDF 정보를 읽는다. 해시는 값 객체가 모양을 다시 검사한다. */
  private static readPdf(value: unknown): IssuedPdf {
    const pdf = IssuedDocumentFactory.readRecord(value, "pdf");
    return {
      storageKey: IssuedDocumentFactory.readText(pdf, "storageKey"),
      sha256: new DocumentHash(IssuedDocumentFactory.readText(pdf, "sha256")),
      bytes: IssuedDocumentFactory.readNumber(pdf, "bytes"),
    };
  }

  /** 서명 목록을 읽는다. 없으면 빈 목록이다. */
  private static readSignatures(value: unknown): readonly SignatureRecord[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error("발행 문서의 signatures가 목록이 아니다");
    return value.map((entry) => IssuedDocumentFactory.readSignature(entry));
  }

  /** 서명 하나를 읽는다. 획은 `SignatureStrokeReader`가 한 곳에서 판단한다. */
  private static readSignature(value: unknown): SignatureRecord {
    const json = IssuedDocumentFactory.readRecord(value, "signatures");
    const options: SignatureRecordOptions = {
      signer: IssuedDocumentFactory.readText(json, "signer"),
      signerId: IssuedDocumentFactory.readText(json, "signerId"),
      signedAt: IssuedDocumentFactory.readText(json, "signedAt"),
      documentHash: new DocumentHash(IssuedDocumentFactory.readText(json, "documentHash")),
      strokes: SignatureStrokeReader.read(json["strokes"] ?? []),
      imagePng: typeof json["imagePng"] === "string" ? json["imagePng"] : "",
      authMethod: json["authMethod"] as SignatureRecordOptions["authMethod"],
      ...(typeof json["ip"] === "string" ? { ip: json["ip"] } : {}),
      ...(typeof json["userAgent"] === "string" ? { userAgent: json["userAgent"] } : {}),
    };
    return new SignatureRecord(options);
  }

  /** 감사 기록을 읽는다. 없으면 빈 목록이다. */
  private static readAuditLog(value: unknown): readonly AuditEntry[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error("발행 문서의 auditLog가 목록이 아니다");
    return value.map((entry) => IssuedDocumentFactory.readAuditEntry(entry));
  }

  /** 감사 기록 하나를 읽는다. */
  private static readAuditEntry(value: unknown): AuditEntry {
    const json = IssuedDocumentFactory.readRecord(value, "auditLog");
    const action = String(json["action"]);
    if (!IssuedDocumentFactory.ACTIONS.includes(action)) {
      throw new Error(`모르는 감사 기록 행위다: ${action}`);
    }
    return new AuditEntry({
      at: IssuedDocumentFactory.readText(json, "at"),
      actor: IssuedDocumentFactory.readText(json, "actor"),
      action: action as AuditAction,
      ...(typeof json["ip"] === "string" ? { ip: json["ip"] } : {}),
      ...(typeof json["userAgent"] === "string" ? { userAgent: json["userAgent"] } : {}),
      ...(json["meta"] === undefined
        ? {}
        : { meta: IssuedDocumentFactory.readRecord(json["meta"], "meta") }),
    });
  }

  /** 상태가 우리가 아는 넷 중 하나인지 확인한다. */
  private static readStatus(value: unknown): IssuedDocumentStatus {
    const status = String(value);
    if (!IssuedDocumentFactory.STATUSES.includes(status)) {
      throw new Error(`모르는 발행 문서 상태다: ${status}`);
    }
    return status as IssuedDocumentStatus;
  }

  /** 빠진 값을 이름과 함께 알린다. 없이 두면 어디가 비었는지 찾아다녀야 한다. */
  private static readText(json: Record<string, unknown>, key: string): string {
    const value = json[key];
    if (typeof value !== "string" || value === "") {
      throw new Error(`발행 문서에 ${key}가 없다`);
    }
    return value;
  }

  /** 숫자 값을 읽는다. */
  private static readNumber(json: Record<string, unknown>, key: string): number {
    const value = json[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`발행 문서에 ${key}가 없다`);
    }
    return value;
  }

  /** 객체 값을 읽는다. */
  private static readRecord(value: unknown, key: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`발행 문서에 ${key}가 없다`);
    }
    return value as Record<string, unknown>;
  }
}
