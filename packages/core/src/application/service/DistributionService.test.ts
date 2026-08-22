import { describe, expect, it, vi } from "vitest";
import type { AuthAdapter } from "../port/AuthAdapter";
import type { DocumentStore } from "../port/DocumentStore";
import { DocumentHash } from "../../domain/document/DocumentHash";
import { IssuedDocument } from "../../domain/document/IssuedDocument";
import { DistributionService } from "./DistributionService";

describe("DistributionService", () => {
  it("취소된 문서에는 접근 토큰을 발급하지 않는다", async () => {
    const document = createDocument().void("admin-1", "재발행");
    const { service, issueToken } = createFixture(document);

    await expect(service.createLink("document-1")).rejects.toThrow(
      "취소된 문서는 배포할 수 없다",
    );
    expect(issueToken).not.toHaveBeenCalled();
  });

  it("문서 수신자와 기본 유효기간으로 발급한 토큰을 반환한다", async () => {
    const { service, issueToken } = createFixture(createDocument());

    const token = await service.createLink("document-1");

    expect(issueToken).toHaveBeenCalledExactlyOnceWith(
      "document-1",
      "employee-1",
      60 * 60 * 24 * 7,
    );
    expect(token).toBe("signed-token");
  });
});

/** 문서 조회와 토큰 발급 사이의 조율만 확인할 스텁을 만든다. */
function createFixture(document: IssuedDocument): {
  service: DistributionService;
  issueToken: ReturnType<typeof vi.fn>;
} {
  const store: DocumentStore = {
    create: vi.fn(async () => undefined),
    get: vi.fn(async () => document),
    update: vi.fn(async () => undefined),
  };
  const issueToken = vi.fn(async () => "signed-token");
  const auth: AuthAdapter = {
    issueToken,
    verifyToken: vi.fn(async () => ({ documentId: "document-1", recipientId: "employee-1" })),
  };
  return { service: new DistributionService(store, auth), issueToken };
}

/** 배포 상태 규칙에 집중할 수 있도록 동일한 발행 문서를 만든다. */
function createDocument(): IssuedDocument {
  return IssuedDocument.issue({
    id: "document-1",
    templateId: "payslip",
    templateVersion: 1,
    recipientId: "employee-1",
    dataSnapshot: {},
    pdf: {
      storageKey: "documents/document-1.pdf",
      sha256: new DocumentHash("b".repeat(64)),
      bytes: 100,
    },
    issuedAt: "2026-08-22T00:00:00.000Z",
    issuedBy: "admin-1",
  });
}
