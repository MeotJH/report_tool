import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { IssuedDocumentFactory } from "@report-tool/core";
import { PdfDocumentRenderer } from "@report-tool/renderer";
import { createMiddleware, createSidecarParts } from "@report-tool/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StaticJsonDataProvider } from "../adapters/StaticJsonDataProvider.js";
import { createDemoTemplate } from "./createDemoTemplate.js";

/**
 * 호스트가 Node가 아닐 때의 배치를 **실제 HTTP로** 통과시킨다.
 *
 * 여기 뜨는 서버는 Spring·Flask 자리를 대신한다. 사이드카는 그 서버를 REST로만
 * 부른다 — 급여 DB도 파일 저장소도 모른 채로 발행본을 만들고 서명을 받는다.
 *
 * `EndToEnd.test.ts`는 어댑터를 같은 프로세스에서 직접 꽂아 확인한다. 그것으로는
 * **HTTP를 건너는 동안 무엇이 깨지는지** 알 수 없다 — 발행 문서 JSON 왕복, 바이트가
 * 한 바이트도 바뀌지 않는지, 열쇠에 든 슬래시가 살아남는지가 전부 이 경계에 있다.
 */
describe("사이드카 ↔ 호스트 REST", () => {
  let host: FakeHostApp;
  let handle: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    host = await FakeHostApp.start();
    const parts = createSidecarParts({
      host: { baseUrl: host.baseUrl, headers: { Authorization: "Bearer sidecar-key-1234" } },
      tokenSecret: "링크-서명-열쇠",
      fontDir: pretendardDirectory(),
    });
    handle = createMiddleware(
      {
        ...parts.deps,
        renderer: new PdfDocumentRenderer(parts.fontProvider, parts.imageProvider),
      },
      { basePath: "/report" },
    );
  }, 60_000);

  afterAll(async () => { await host.stop(); });

  it("호스트를 REST로만 부르면서 발행부터 서명까지 끝난다", async () => {
    const documentId = await issue();
    const token = await link(documentId);

    const viewed = await view(token);
    const signed = await sign(token);

    expect(viewed.status).toBe("viewed");
    expect(signed.status).toBe("signed");
  }, 60_000);

  it("호스트가 받은 바이트와 사이드카가 잰 해시가 같다", async () => {
    const documentId = await issue();

    const document = IssuedDocumentFactory.fromJSON(host.documents.get(documentId) ?? {});
    const stored = host.files.get(document.pdf.storageKey);

    expect(stored).toBeDefined();
    expect(createHash("sha256").update(stored ?? new Uint8Array()).digest("hex"))
      .toBe(document.pdf.sha256.toHex());
  }, 60_000);

  it("호스트에 남는 것은 JSON뿐이고, 그것만으로 문서가 되살아난다", async () => {
    const documentId = await issue();
    const token = await link(documentId);
    // 수신자는 언제나 열어 본 뒤에 서명한다. 뷰어가 먼저 문서를 받아 오기 때문이다.
    await view(token);
    await sign(token);

    const restored = IssuedDocumentFactory.fromJSON(host.documents.get(documentId) ?? {});

    expect(restored.status).toBe("signed");
    expect(restored.getSignatures()[0]?.documentHash.equals(restored.pdf.sha256)).toBe(true);
    expect(restored.getAuditLog().map((entry) => entry.action)).toEqual(["issue", "view", "sign"]);
  }, 60_000);

  it("발행본이 진짜 PDF이고 한글이 들어 있다", async () => {
    const bytes = Buffer.from((await view(await link(await issue()))).pdfBase64, "base64");

    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(20_000);
  }, 60_000);

  it("호스트가 없다고 답하면 그대로 없다고 알린다", async () => {
    const response = await handle(new Request("http://sidecar/report/documents/issue", {
      method: "POST",
      body: JSON.stringify({
        templateId: "없는양식", recipientId: "emp-1", issuedBy: "admin",
      }),
    }));

    expect(response.status).toBe(422);
    expect((await response.json() as { error: string }).error).toContain("호스트에 없다");
  }, 60_000);

  /** 발행 요청을 보내고 문서 식별자를 받는다. */
  async function issue(): Promise<string> {
    const response = await handle(new Request("http://sidecar/report/documents/issue", {
      method: "POST",
      body: JSON.stringify({
        templateId: "demo-payslip", recipientId: "emp-1", issuedBy: "admin",
      }),
    }));
    expect(response.status).toBe(201);
    return (await response.json() as { id: string }).id;
  }

  /** 열람 링크 토큰을 받는다. */
  async function link(documentId: string): Promise<string> {
    const response = await handle(new Request(
      `http://sidecar/report/documents/${documentId}/link`,
      { method: "POST", body: "{}" },
    ));
    expect(response.status).toBe(200);
    return (await response.json() as { token: string }).token;
  }

  /** 토큰으로 문서를 연다. */
  async function view(token: string): Promise<{ status: string; pdfBase64: string }> {
    const response = await handle(new Request(
      `http://sidecar/report/documents/view?token=${encodeURIComponent(token)}`,
    ));
    expect(response.status).toBe(200);
    return await response.json() as { status: string; pdfBase64: string };
  }

  /** 서명을 접수한다. */
  async function sign(token: string): Promise<{ status: string }> {
    const response = await handle(new Request("http://sidecar/report/documents/sign", {
      method: "POST",
      body: JSON.stringify({
        token,
        strokes: [{ points: [[10, 20], [12, 24]] }],
        imagePng: "iVBORw0KGgo=",
        authMethod: "email_link",
      }),
    }));
    expect(response.status).toBe(200);
    return await response.json() as { status: string };
  }
});

/**
 * Spring·Flask 자리를 대신하는 가짜 호스트 앱이다.
 *
 * [HOST_API.md](../../../docs/HOST_API.md)가 요구하는 엔드포인트만 구현한다.
 * **문서를 JSON 그대로 담아 둔다** — 실제 DB가 하는 일이 그것이고, 객체를 들고
 * 있으면 왕복이 검증되지 않는다.
 */
class FakeHostApp {
  readonly files = new Map<string, Uint8Array>();
  readonly documents = new Map<string, Record<string, unknown>>();
  private readonly data = new StaticJsonDataProvider();

  /** 주소는 포트를 받은 뒤에야 정해지므로 나중에 채운다. */
  baseUrl = "";

  /** 서버 하나를 들고 있는다. */
  private constructor(private readonly server: Server) {}

  /**
   * 빈 포트에 호스트 앱을 띄운다.
   *
   * 인스턴스는 **하나만** 만든다. 요청 처리기를 붙인 것과 시험이 들여다보는 것이
   * 다른 객체면, 저장은 잘 되는데 확인만 실패한다 — 실제로 그렇게 한 번 헤맸다.
   */
  static async start(): Promise<FakeHostApp> {
    const app = new FakeHostApp(createServer());
    app.server.on("request", (request, response) => { void app.route(request, response); });
    await new Promise<void>((resolve) => app.server.listen(0, "127.0.0.1", resolve));
    app.baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}/report-api`;
    return app;
  }

  /** 시험이 끝나면 포트를 돌려준다. */
  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  /** 사이드카가 부르는 여섯 자리를 처리한다. */
  private async route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = decodeURIComponent((request.url ?? "").replace("/report-api", "").split("?")[0] ?? "");
    const method = request.method ?? "GET";
    if (method === "GET" && path === "/templates/demo-payslip") {
      return FakeHostApp.sendJson(response, createDemoTemplate().publish().toJSON());
    }
    if (method === "GET" && path.startsWith("/data/")) {
      const recipientId = path.split("/")[3] ?? "";
      return FakeHostApp.sendJson(response, await this.data.resolve("demo-payslip", recipientId));
    }
    if (method === "PUT" && path.startsWith("/files/")) {
      this.files.set(path.slice("/files/".length), await FakeHostApp.readBytes(request));
      return FakeHostApp.sendJson(response, {});
    }
    if (method === "GET" && path.startsWith("/files/")) {
      const bytes = this.files.get(path.slice("/files/".length));
      if (bytes === undefined) return FakeHostApp.sendMissing(response);
      response.setHeader("Content-Type", "application/pdf");
      response.end(Buffer.from(bytes));
      return;
    }
    if (method === "POST" && path === "/documents") {
      const json = JSON.parse((await FakeHostApp.readBytes(request)).toString()) as Record<string, unknown>;
      this.documents.set(String(json["id"]), json);
      return FakeHostApp.sendJson(response, {});
    }
    if (path.startsWith("/documents/")) {
      const id = path.slice("/documents/".length);
      if (method === "GET") {
        const found = this.documents.get(id);
        return found === undefined
          ? FakeHostApp.sendMissing(response)
          : FakeHostApp.sendJson(response, found);
      }
      if (method === "PUT") {
        // 없는 문서를 만들어 주지 않는다. 만들어 주면 사이드카 쪽 버그가 조용히
        // 새 문서를 만든다(HOST_API.md).
        if (!this.documents.has(id)) return FakeHostApp.sendMissing(response);
        const json = JSON.parse((await FakeHostApp.readBytes(request)).toString()) as Record<string, unknown>;
        this.documents.set(id, json);
        return FakeHostApp.sendJson(response, {});
      }
    }
    FakeHostApp.sendMissing(response);
  }

  /** 본문 바이트를 모은다. */
  private static async readBytes(request: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }

  /** JSON으로 답한다. */
  private static sendJson(response: ServerResponse, body: unknown): void {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(body));
  }

  /** 없다고 답한다. 사이드카는 이것을 "없다"로 읽는다. */
  private static sendMissing(response: ServerResponse): void {
    response.statusCode = 404;
    response.end("");
  }
}

/** 저장소에 이미 들어 있는 Pretendard TTF 폴더다. */
function pretendardDirectory(): string {
  return new URL(
    "../../../node_modules/pretendard/dist/public/static/alternative/",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1");
}
