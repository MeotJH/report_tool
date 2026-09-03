import { describe, expect, it } from "vitest";
import { DistributionController } from "./DistributionController.js";
import { SigningController } from "./SigningController.js";
import { StubWorld } from "../test/StubAdapters.js";

describe("DistributionController", () => {
  it("발행된 문서에 열람 토큰을 발급한다", async () => {
    const { world, documentId } = await issuedWorld();
    const controller = new DistributionController(world.distributionService());

    const response = await controller.handle(linkRequest(), { id: documentId });

    expect(response.status).toBe(200);
    expect((await response.json() as { token: string }).token).toBe(`${documentId}:emp-1`);
  });

  it("없는 문서로 링크를 만들려 하면 422로 답한다", async () => {
    const world = new StubWorld();
    const controller = new DistributionController(world.distributionService());

    const response = await controller.handle(linkRequest(), { id: "없는문서" });

    expect(response.status).toBe(422);
  });
});

describe("SigningController.handleView", () => {
  it("토큰으로 문서를 열면 PDF와 상태를 함께 준다", async () => {
    const { world, token } = await issuedWorld();
    const controller = new SigningController(world.signingService());

    const response = await controller.handleView(viewRequest(token));

    const body = await response.json() as { pdfBase64: string; status: string };
    expect(response.status).toBe(200);
    expect(body.status).toBe("viewed");
    expect(atob(body.pdfBase64).slice(0, 4)).toBe("%PDF");
  });

  it("토큰이 없으면 400으로 돌려보낸다", async () => {
    const { world } = await issuedWorld();
    const controller = new SigningController(world.signingService());

    const response = await controller.handleView(new Request("http://host/documents/view"));

    expect(response.status).toBe(400);
  });

  it("토큰이 유효하지 않으면 401로 답한다", async () => {
    const { world } = await issuedWorld();
    const controller = new SigningController(world.signingService());

    const response = await controller.handleView(viewRequest("망가진토큰"));

    expect(response.status).toBe(401);
  });
});

describe("SigningController.handleSign", () => {
  it("서명을 접수하면 문서가 서명됨으로 바뀐다", async () => {
    const { world, token, documentId } = await issuedWorld();
    const controller = new SigningController(world.signingService());

    const response = await controller.handleSign(signRequest(token));

    expect(response.status).toBe(200);
    expect((await response.json() as { status: string }).status).toBe("signed");
    expect(world.documents.get(documentId)?.status).toBe("signed");
  });

  it("서명 흔적이 없으면 422로 돌려보낸다", async () => {
    const { world, token } = await issuedWorld();
    const controller = new SigningController(world.signingService());

    const response = await controller.handleSign(new Request("http://host/documents/sign", {
      method: "POST",
      body: JSON.stringify({ token, strokes: [], imagePng: "", authMethod: "email_link" }),
    }));

    expect(response.status).toBe(422);
  });

  it("토큰이 빠지면 400으로 돌려보낸다", async () => {
    const { world } = await issuedWorld();
    const controller = new SigningController(world.signingService());

    const response = await controller.handleSign(new Request("http://host/documents/sign", {
      method: "POST",
      body: JSON.stringify({ imagePng: "iVBOR", authMethod: "email_link" }),
    }));

    expect(response.status).toBe(400);
  });

  it("토큰이 유효하지 않으면 401로 답한다", async () => {
    const { world } = await issuedWorld();
    const controller = new SigningController(world.signingService());

    const response = await controller.handleSign(signRequest("망가진토큰"));

    expect(response.status).toBe(401);
  });
});

/** 문서 하나를 실제로 발행해 둔 세계를 만든다. 링크·열람·서명의 출발점이다. */
async function issuedWorld(): Promise<{
  world: StubWorld;
  documentId: string;
  token: string;
}> {
  const world = new StubWorld();
  const document = await world.issuanceService().issue("payslip", "emp-1", "admin");
  return { world, documentId: document.id, token: `${document.id}:emp-1` };
}

/** 링크 발급 요청이다. 유효 기간은 서비스 기본값에 맡긴다. */
function linkRequest(): Request {
  return new Request("http://host/documents/x/link", { method: "POST", body: "{}" });
}

/** 열람 요청이다. 토큰은 질의 문자열로 온다. */
function viewRequest(token: string): Request {
  return new Request(`http://host/documents/view?token=${encodeURIComponent(token)}`);
}

/** 서명 접수 요청이다. 흔적은 점 하나면 충분하다. */
function signRequest(token: string): Request {
  return new Request("http://host/documents/sign", {
    method: "POST",
    body: JSON.stringify({
      token,
      strokes: [{ points: [[1, 2], [3, 4]] }],
      imagePng: "iVBORw0KGgo=",
      authMethod: "email_link",
    }),
  });
}
