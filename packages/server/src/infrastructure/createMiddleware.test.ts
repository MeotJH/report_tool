import { describe, expect, it } from "vitest";
import { createMiddleware } from "./createMiddleware.js";
import { StubWorld } from "../test/StubAdapters.js";

describe("createMiddleware", () => {
  it("등록하지 않은 경로는 404로 답한다", async () => {
    const handle = createMiddleware(depsOf(new StubWorld()));

    const response = await handle(new Request("http://host/documents/unknown"));

    expect(response.status).toBe(404);
  });

  it("발행 요청을 발행 컨트롤러로 보낸다", async () => {
    const handle = createMiddleware(depsOf(new StubWorld()));

    const response = await handle(new Request("http://host/documents/issue", {
      method: "POST",
      body: JSON.stringify({ templateId: "payslip", recipientId: "emp-1", issuedBy: "admin" }),
    }));

    expect(response.status).toBe(201);
  });

  it("발행부터 서명까지 요청 네 번으로 끝난다", async () => {
    const world = new StubWorld();
    const handle = createMiddleware(depsOf(world));

    const issued = await handle(new Request("http://host/documents/issue", {
      method: "POST",
      body: JSON.stringify({ templateId: "payslip", recipientId: "emp-1", issuedBy: "admin" }),
    }));
    const { id } = await issued.json() as { id: string };

    const linked = await handle(new Request(`http://host/documents/${id}/link`, {
      method: "POST",
      body: "{}",
    }));
    const { token } = await linked.json() as { token: string };

    const viewed = await handle(
      new Request(`http://host/documents/view?token=${encodeURIComponent(token)}`),
    );
    const view = await viewed.json() as { status: string; pdfBase64: string };

    const signed = await handle(new Request("http://host/documents/sign", {
      method: "POST",
      body: JSON.stringify({
        token,
        strokes: [{ points: [[1, 2]] }],
        imagePng: "iVBORw0KGgo=",
        authMethod: "email_link",
      }),
    }));

    expect(view.status).toBe("viewed");
    expect(atob(view.pdfBase64).slice(0, 4)).toBe("%PDF");
    expect((await signed.json() as { status: string }).status).toBe("signed");
    expect(world.documents.get(id)?.status).toBe("signed");
  });

  it("붙인 자리(basePath)를 떼고 경로를 맞춘다", async () => {
    const handle = createMiddleware(depsOf(new StubWorld()), { basePath: "/api/report" });

    const response = await handle(new Request("http://host/api/report/documents/issue", {
      method: "POST",
      body: JSON.stringify({ templateId: "payslip", recipientId: "emp-1", issuedBy: "admin" }),
    }));

    expect(response.status).toBe(201);
  });

  it("붙인 자리 밖으로 온 요청은 404로 답한다", async () => {
    const handle = createMiddleware(depsOf(new StubWorld()), { basePath: "/api/report" });

    const response = await handle(new Request("http://host/documents/issue", { method: "POST" }));

    expect(response.status).toBe(404);
  });

  it("붙인 자리 끝의 슬래시는 있으나 없으나 같다", async () => {
    const handle = createMiddleware(depsOf(new StubWorld()), { basePath: "/api/report/" });

    const response = await handle(
      new Request("http://host/api/report/documents/view?token=doc:emp"),
    );

    expect(response.status).not.toBe(404);
  });

  it("만료된 링크로 열면 401로 답한다", async () => {
    const handle = createMiddleware(depsOf(new StubWorld()));

    const response = await handle(new Request("http://host/documents/view?token=망가진토큰"));

    expect(response.status).toBe(401);
  });
});

/** 호스트가 구현해야 하는 어댑터 자리를 스텁으로 채운다. */
function depsOf(world: StubWorld) {
  return {
    templateStore: world.templateStore,
    documentStore: world.documentStore,
    dataProvider: world.dataProvider,
    storage: world.storage,
    authAdapter: world.auth,
    renderer: world.renderer,
    hashProvider: world.hashProvider,
  };
}
