import { describe, expect, it } from "vitest";
import { DocumentHash } from "./DocumentHash";
import { IssuedDocument } from "./IssuedDocument";
import { IssuedDocumentFactory } from "./IssuedDocumentFactory";
import { SignatureRecord } from "./SignatureRecord";

describe("IssuedDocumentFactory", () => {
  it("발행 직후 문서를 왕복시켜도 그대로다", () => {
    const document = issued();

    const restored = IssuedDocumentFactory.fromJSON(document.toJSON());

    expect(restored.id).toBe(document.id);
    expect(restored.templateId).toBe(document.templateId);
    expect(restored.templateVersion).toBe(document.templateVersion);
    expect(restored.recipientId).toBe(document.recipientId);
    expect(restored.status).toBe("issued");
    expect(restored.issuedAt).toBe(document.issuedAt);
    expect(restored.issuedBy).toBe(document.issuedBy);
  });

  it("발행 당시 데이터 스냅샷을 그대로 보존한다", () => {
    const restored = IssuedDocumentFactory.fromJSON(issued().toJSON());

    expect(restored.dataSnapshot).toEqual({ employee: { name: "홍길동" }, amount: 3200000 });
  });

  it("PDF 해시가 값 객체로 되살아난다", () => {
    const restored = IssuedDocumentFactory.fromJSON(issued().toJSON());

    expect(restored.pdf.sha256.toHex()).toBe("a".repeat(64));
    expect(restored.pdf.storageKey).toBe("documents/doc-1.pdf");
    expect(restored.pdf.bytes).toBe(1234);
  });

  it("서명된 문서를 왕복시키면 상태와 서명이 남는다", () => {
    const signed = issued().addSignature(signature());

    const restored = IssuedDocumentFactory.fromJSON(signed.toJSON());

    expect(restored.status).toBe("signed");
    expect(restored.getSignatures()).toHaveLength(1);
    expect(restored.getSignatures()[0]?.signerId).toBe("emp-1");
    expect(restored.getSignatures()[0]?.documentHash.equals(restored.pdf.sha256)).toBe(true);
  });

  it("서명 흔적의 좌표와 이미지까지 남는다", () => {
    const signed = issued().addSignature(signature());

    const restored = IssuedDocumentFactory.fromJSON(signed.toJSON());

    expect(restored.getSignatures()[0]?.strokes).toEqual([{ points: [[1, 2], [3, 4, 0.5]] }]);
    expect(restored.getSignatures()[0]?.imagePng).toBe("iVBORw0KGgo=");
    expect(restored.getSignatures()[0]?.authMethod).toBe("email_link");
  });

  it("감사 기록이 순서대로 남는다", () => {
    const viewed = issued().markViewed("emp-1", "127.0.0.1", "browser");

    const restored = IssuedDocumentFactory.fromJSON(viewed.toJSON());

    expect(restored.getAuditLog().map((entry) => entry.action)).toEqual(["issue", "view"]);
    expect(restored.getAuditLog()[1]?.ip).toBe("127.0.0.1");
    expect(restored.getAuditLog()[1]?.userAgent).toBe("browser");
  });

  it("취소 사유가 담긴 감사 기록도 남는다", () => {
    const voided = issued().void("admin", "잘못 발행함");

    const restored = IssuedDocumentFactory.fromJSON(voided.toJSON());

    expect(restored.status).toBe("voided");
    expect(restored.getAuditLog()[1]?.meta).toEqual({ reason: "잘못 발행함" });
  });

  it("되살린 문서도 상태 전이 규칙을 그대로 지킨다", () => {
    const restored = IssuedDocumentFactory.fromJSON(issued().void("admin", "사유").toJSON());

    expect(() => restored.markViewed("emp-1")).toThrow();
  });

  it("모르는 저장 형식은 거절한다", () => {
    const json = { ...issued().toJSON(), schemaVersion: 99 };

    expect(() => IssuedDocumentFactory.fromJSON(json))
      .toThrow("지원하지 않는 발행 문서 형식이다: 99");
  });

  it("필수 값이 빠지면 무엇이 빠졌는지 말한다", () => {
    const json = { ...issued().toJSON() };
    delete json["recipientId"];

    expect(() => IssuedDocumentFactory.fromJSON(json))
      .toThrow("발행 문서에 recipientId가 없다");
  });

  it("모르는 상태 값은 거절한다", () => {
    const json = { ...issued().toJSON(), status: "삭제됨" };

    expect(() => IssuedDocumentFactory.fromJSON(json))
      .toThrow("모르는 발행 문서 상태다: 삭제됨");
  });
});

/** 저장·복원 시험에 쓸 발행 문서다. */
function issued(): IssuedDocument {
  return IssuedDocument.issue({
    id: "doc-1",
    templateId: "payslip",
    templateVersion: 2,
    recipientId: "emp-1",
    dataSnapshot: { employee: { name: "홍길동" }, amount: 3200000 },
    pdf: {
      storageKey: "documents/doc-1.pdf",
      sha256: new DocumentHash("a".repeat(64)),
      bytes: 1234,
    },
    issuedAt: "2026-09-01T00:00:00.000Z",
    issuedBy: "admin",
  });
}

/** 발행본 해시에 걸린 서명 하나다. */
function signature(): SignatureRecord {
  return new SignatureRecord({
    signer: "employee",
    signerId: "emp-1",
    signedAt: "2026-09-02T00:00:00.000Z",
    documentHash: new DocumentHash("a".repeat(64)),
    strokes: [{ points: [[1, 2], [3, 4, 0.5]] }],
    imagePng: "iVBORw0KGgo=",
    authMethod: "email_link",
    ip: "127.0.0.1",
    userAgent: "browser",
  });
}
