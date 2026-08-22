import { describe, expect, it } from "vitest";
import { AuditEntry } from "./AuditEntry";
import { DocumentHash } from "./DocumentHash";
import { SignatureRecord } from "./SignatureRecord";

describe("SignatureRecord", () => {
  it("서명자와 인증 정보 및 서명 흔적을 보관한다", () => {
    const documentHash = new DocumentHash("2".repeat(64));
    const strokes = [{ points: [[10, 20, 0.5] as const] }];

    const record = new SignatureRecord({
      signer: "홍길동",
      signerId: "employee-1",
      signedAt: "2026-08-22T01:00:00.000Z",
      documentHash,
      strokes,
      imagePng: "",
      authMethod: "sms_otp",
      ip: "127.0.0.1",
      userAgent: "test-browser",
    });

    expect(record.signer).toBe("홍길동");
    expect(record.documentHash).toBe(documentHash);
    expect(record.strokes).toEqual(strokes);
    expect(record.authMethod).toBe("sms_otp");
  });

  it("스트로크와 이미지가 모두 없으면 서명으로 만들지 않는다", () => {
    expect(() => new SignatureRecord({
      signer: "홍길동",
      signerId: "employee-1",
      signedAt: "2026-08-22T01:00:00.000Z",
      documentHash: new DocumentHash("2".repeat(64)),
      strokes: [],
      imagePng: "",
      authMethod: "none",
    })).toThrow("서명 흔적이 전혀 없다");
  });
});

describe("AuditEntry", () => {
  it("행위자와 행위 및 부가 정보를 보관한다", () => {
    const entry = new AuditEntry({
      at: "2026-08-22T02:00:00.000Z",
      actor: "admin-1",
      action: "void",
      ip: "127.0.0.1",
      userAgent: "test-browser",
      meta: { reason: "재발행" },
    });

    expect(entry.action).toBe("void");
    expect(entry.actor).toBe("admin-1");
    expect(entry.meta).toEqual({ reason: "재발행" });
  });
});
