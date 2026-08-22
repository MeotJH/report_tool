import { describe, expect, it } from "vitest";
import { DocumentHash } from "./DocumentHash";
import { IssuedDocument } from "./IssuedDocument";
import { SignatureRecord } from "./SignatureRecord";

const issuedHash = new DocumentHash("3".repeat(64));

describe("IssuedDocument", () => {
  it("발행 상태와 발행 감사로그 한 건으로 시작한다", () => {
    const document = issueDocument();

    expect(document.status).toBe("issued");
    expect(document.getAuditLog()).toHaveLength(1);
    expect(document.getAuditLog()[0]?.action).toBe("issue");
  });

  it("최초 조회 시 viewed 상태의 새 문서를 만든다", () => {
    const original = issueDocument();

    const viewed = original.markViewed("employee-1", "127.0.0.1");

    expect(viewed.status).toBe("viewed");
    expect(viewed.getAuditLog()).toHaveLength(2);
    expect(original.status).toBe("issued");
  });

  it("여러 번 조회해도 상태를 유지하고 조회 감사로그는 남긴다", () => {
    const signed = issueDocument().addSignature(createSignature(issuedHash));

    const viewedAgain = signed.markViewed("employee-1");

    expect(viewedAgain.status).toBe("signed");
    expect(viewedAgain.getAuditLog().at(-1)?.action).toBe("view");
  });

  it("발행 PDF와 다른 해시의 서명은 변조 가능성이 있어 거부한다", () => {
    const document = issueDocument();
    const signature = createSignature(new DocumentHash("4".repeat(64)));

    expect(() => document.addSignature(signature)).toThrow(
      "서명 대상 해시가 발행된 문서와 다르다 — 변조 의심",
    );
  });

  it("발행 PDF와 같은 해시의 서명을 추가해 signed 상태로 전환한다", () => {
    const document = issueDocument();
    const signature = createSignature(issuedHash);

    const signed = document.addSignature(signature);

    expect(signed.status).toBe("signed");
    expect(signed.getSignatures()).toEqual([signature]);
    expect(signed.getAuditLog().at(-1)?.action).toBe("sign");
  });

  it("문서를 취소하며 사유를 감사로그에 남긴다", () => {
    const voided = issueDocument().void("admin-1", "잘못된 수신자");

    expect(voided.status).toBe("voided");
    expect(voided.getAuditLog().at(-1)?.meta).toEqual({ reason: "잘못된 수신자" });
  });

  it("취소된 문서에는 서명이나 조회를 추가하지 않는다", () => {
    const voided = issueDocument().void("admin-1", "재발행");

    expect(() => voided.addSignature(createSignature(issuedHash))).toThrow(
      "취소된 문서는 변경할 수 없다",
    );
    expect(() => voided.markViewed("employee-1")).toThrow(
      "취소된 문서는 변경할 수 없다",
    );
  });

  it("이미 취소된 문서를 다시 취소하지 않는다", () => {
    const voided = issueDocument().void("admin-1", "재발행");

    expect(() => voided.void("admin-1", "다시 취소")).toThrow(
      "이미 취소된 문서다",
    );
  });
});

/** 테스트가 상태 전이 규칙에 집중할 수 있도록 동일한 발행 문서를 만든다. */
function issueDocument(): IssuedDocument {
  return IssuedDocument.issue({
    id: "document-1",
    templateId: "payslip",
    templateVersion: 1,
    recipientId: "employee-1",
    dataSnapshot: { employee: { name: "홍길동" } },
    pdf: {
      storageKey: "documents/document-1.pdf",
      sha256: issuedHash,
      bytes: 1024,
    },
    issuedAt: "2026-08-22T00:00:00.000Z",
    issuedBy: "admin-1",
  });
}

/** 테스트마다 서명 대상 해시만 바꿔 변조 검사 조건을 분명하게 만든다. */
function createSignature(documentHash: DocumentHash): SignatureRecord {
  return new SignatureRecord({
    signer: "홍길동",
    signerId: "employee-1",
    signedAt: "2026-08-22T01:00:00.000Z",
    documentHash,
    strokes: [{ points: [[10, 20, 0.5]] }],
    imagePng: "",
    authMethod: "sms_otp",
  });
}
