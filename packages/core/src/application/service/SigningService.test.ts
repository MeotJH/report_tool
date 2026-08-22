import { describe, expect, it, vi } from "vitest";
import type { AuthAdapter } from "../port/AuthAdapter";
import type { DocumentStore } from "../port/DocumentStore";
import type { StorageAdapter } from "../port/StorageAdapter";
import { DocumentHash } from "../../domain/document/DocumentHash";
import { IssuedDocument } from "../../domain/document/IssuedDocument";
import { SigningService } from "./SigningService";

describe("SigningService", () => {
  it("토큰으로 문서를 조회하고 viewed 상태를 저장한 뒤 PDF를 반환한다", async () => {
    const fixture = createFixture();

    const result = await fixture.service.view("token", "127.0.0.1", "browser");

    expect(result.document.status).toBe("viewed");
    expect(result.pdfBytes).toEqual(fixture.pdfBytes);
    expect(fixture.update).toHaveBeenCalledExactlyOnceWith(result.document);
    expect(fixture.storageGet).toHaveBeenCalledWith("documents/document-1.pdf");
  });

  it("서버 문서의 해시로 서명 기록을 만들고 signed 상태를 저장한다", async () => {
    const fixture = createFixture();

    const signed = await fixture.service.sign("token", {
      strokes: [{ points: [[10, 20, 0.5]] }],
      imagePng: "",
      authMethod: "sms_otp",
      ip: "127.0.0.1",
      userAgent: "browser",
    });

    expect(signed.status).toBe("signed");
    expect(signed.getSignatures()[0]?.documentHash).toBe(signed.pdf.sha256);
    expect(fixture.update).toHaveBeenCalledExactlyOnceWith(signed);
  });
});

/** 인증·저장 기술을 스텁으로 바꿔 조회와 서명 유스케이스만 검증한다. */
function createFixture(): {
  service: SigningService;
  pdfBytes: Uint8Array;
  update: ReturnType<typeof vi.fn>;
  storageGet: ReturnType<typeof vi.fn>;
} {
  const document = createDocument();
  const update = vi.fn(async (): Promise<void> => undefined);
  const store: DocumentStore = {
    create: vi.fn(async () => undefined),
    get: vi.fn(async () => document),
    update,
  };
  const auth: AuthAdapter = {
    issueToken: vi.fn(async () => "token"),
    verifyToken: vi.fn(async () => ({ documentId: "document-1", recipientId: "employee-1" })),
  };
  const pdfBytes = new Uint8Array([1, 2, 3]);
  const storageGet = vi.fn(async () => pdfBytes);
  const storage: StorageAdapter = {
    put: vi.fn(async () => undefined),
    get: storageGet,
  };
  return { service: new SigningService(store, auth, storage), pdfBytes, update, storageGet };
}

/** 조회와 서명이 공유할 동일한 발행 문서를 만든다. */
function createDocument(): IssuedDocument {
  return IssuedDocument.issue({
    id: "document-1",
    templateId: "payslip",
    templateVersion: 1,
    recipientId: "employee-1",
    dataSnapshot: {},
    pdf: {
      storageKey: "documents/document-1.pdf",
      sha256: new DocumentHash("c".repeat(64)),
      bytes: 3,
    },
    issuedAt: "2026-08-22T00:00:00.000Z",
    issuedBy: "admin-1",
  });
}
