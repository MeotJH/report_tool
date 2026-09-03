import { describe, expect, it } from "vitest";
import { IssuanceController } from "./IssuanceController.js";
import { createIssuanceService, draftTemplate } from "../test/StubAdapters.js";

describe("IssuanceController", () => {
  it("발행에 성공하면 문서 식별자와 함께 201로 답한다", async () => {
    const controller = new IssuanceController(createIssuanceService());

    const response = await controller.handle(issueRequest({
      templateId: "payslip", recipientId: "emp-1", issuedBy: "admin",
    }));

    expect(response.status).toBe(201);
    expect((await response.json() as { id: string }).id).not.toBe("");
  });

  it("발행 결과를 JSON으로 알린다", async () => {
    const controller = new IssuanceController(createIssuanceService());

    const response = await controller.handle(issueRequest({
      templateId: "payslip", recipientId: "emp-1", issuedBy: "admin",
    }));

    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect((await response.json() as { status: string }).status).toBe("issued");
  });

  it("필수 값이 빠지면 400으로 돌려보낸다", async () => {
    const controller = new IssuanceController(createIssuanceService());

    const response = await controller.handle(issueRequest({ recipientId: "emp-1" }));

    expect(response.status).toBe(400);
  });

  it("무엇이 빠졌는지 알려 준다", async () => {
    const controller = new IssuanceController(createIssuanceService());

    const response = await controller.handle(issueRequest({ recipientId: "emp-1" }));

    expect((await response.json() as { error: string }).error).toContain("templateId");
  });

  it("본문이 JSON이 아니면 400으로 돌려보낸다", async () => {
    const controller = new IssuanceController(createIssuanceService());

    const response = await controller.handle(
      new Request("http://host/documents/issue", { method: "POST", body: "{" }),
    );

    expect(response.status).toBe(400);
  });

  it("초안 템플릿을 발행하려 하면 422로 답한다", async () => {
    const controller = new IssuanceController(createIssuanceService({ template: draftTemplate() }));

    const response = await controller.handle(issueRequest({
      templateId: "payslip", recipientId: "emp-1", issuedBy: "admin",
    }));

    expect(response.status).toBe(422);
  });

  it("실패한 이유를 그대로 돌려준다", async () => {
    const controller = new IssuanceController(createIssuanceService({ template: draftTemplate() }));

    const response = await controller.handle(issueRequest({
      templateId: "payslip", recipientId: "emp-1", issuedBy: "admin",
    }));

    expect((await response.json() as { error: string }).error)
      .toBe("발행되지 않은 템플릿은 발행할 수 없다");
  });
});

/** 발행 요청 하나를 만든다. 빠진 필드를 테스트마다 다르게 준다. */
function issueRequest(body: Readonly<Record<string, string>>): Request {
  return new Request("http://host/documents/issue", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
