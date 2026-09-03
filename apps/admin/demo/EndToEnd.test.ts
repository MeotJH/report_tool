import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PdfDocumentRenderer } from "@report-tool/renderer";
import { createMiddleware } from "@report-tool/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FileSystemStorageAdapter } from "../adapters/FileSystemStorageAdapter.js";
import { InMemoryDocumentStore } from "../adapters/InMemoryDocumentStore.js";
import { InMemoryTemplateStore } from "../adapters/InMemoryTemplateStore.js";
import { NodeCryptoHashProvider } from "../adapters/NodeCryptoHashProvider.js";
import { NodeFontProvider } from "../adapters/NodeFontProvider.js";
import { StaticJsonDataProvider } from "../adapters/StaticJsonDataProvider.js";
import { TokenAuthAdapter } from "../adapters/TokenAuthAdapter.js";
import { createDemoTemplate } from "./createDemoTemplate.js";

/**
 * 발행부터 서명까지를 **실제 어댑터와 실제 PDF 렌더러로** 한 번에 통과시킨다.
 *
 * 서버 패키지의 테스트는 스텁 렌더러를 쓴다. 그래서 "요청이 컨트롤러로 잘 가는가"는
 * 증명하지만 "실제로 한글이 박힌 PDF가 나오는가"는 증명하지 못한다. 그 둘 사이에
 * 폰트 서브셋·해시·파일 저장이 들어 있고, 지금까지 이 저장소를 가장 여러 번
 * 물어뜯은 자리가 바로 거기다.
 */
describe("발행 → 링크 → 열람 → 서명", () => {
  let root = "";
  let handle: (request: Request) => Promise<Response>;
  let documents: InMemoryDocumentStore;
  let storage: FileSystemStorageAdapter;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "report-tool-e2e-"));
    const templates = new InMemoryTemplateStore();
    await templates.save(createDemoTemplate());
    await templates.publish("demo-payslip", 1);
    documents = new InMemoryDocumentStore();
    storage = new FileSystemStorageAdapter(root);
    handle = createMiddleware({
      templateStore: templates,
      documentStore: documents,
      dataProvider: new StaticJsonDataProvider(),
      storage,
      authAdapter: new TokenAuthAdapter("데모-비밀열쇠"),
      renderer: new PdfDocumentRenderer(new NodeFontProvider(pretendardDirectory())),
      hashProvider: new NodeCryptoHashProvider(),
    });
  }, 60_000);

  afterAll(async () => { await rm(root, { recursive: true, force: true }); });

  it("네 번의 요청으로 서명까지 끝난다", async () => {
    const documentId = await issue();
    const token = await link(documentId);
    const viewed = await view(token);
    const signed = await sign(token);

    expect(viewed.status).toBe("viewed");
    expect(signed.status).toBe("signed");
  }, 60_000);

  it("발행본이 실제 PDF이고 한글이 들어 있다", async () => {
    const documentId = await issue();

    const { pdfBase64 } = await view(await link(documentId));
    const bytes = Buffer.from(pdfBase64, "base64");

    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // 한글 글리프가 서브셋에서 빠지면 파일은 나오지만 글자가 사라진다.
    // 그 사고는 크기로 먼저 드러난다 — 폰트가 빠진 PDF는 눈에 띄게 작다.
    expect(bytes.length).toBeGreaterThan(20_000);
  }, 60_000);

  it("저장된 파일의 해시가 문서에 적힌 해시와 같다", async () => {
    const documentId = await issue();
    const document = await documents.get(documentId);

    const stored = await storage.get(document.pdf.storageKey);

    expect(createHash("sha256").update(stored).digest("hex"))
      .toBe(document.pdf.sha256.toHex());
  }, 60_000);

  it("서명은 서버가 보관한 그 해시에 걸린다", async () => {
    const documentId = await issue();
    const token = await link(documentId);
    await view(token);

    await sign(token);

    const document = await documents.get(documentId);
    expect(document.getSignatures()[0]?.documentHash).toBe(document.pdf.sha256);
  }, 60_000);

  it("서명이 끝난 문서는 데이터 스냅샷을 그대로 들고 있다", async () => {
    const documentId = await issue();
    const document = await documents.get(documentId);

    expect((document.dataSnapshot as { employee: { name: string } }).employee.name)
      .toBe("홍길동");
  }, 60_000);

  it("남의 열쇠로 만든 토큰으로는 열리지 않는다", async () => {
    const documentId = await issue();
    const forged = await new TokenAuthAdapter("다른열쇠").issueToken(documentId, "emp-1", 60);

    const response = await handle(
      new Request(`http://host/documents/view?token=${encodeURIComponent(forged)}`),
    );

    expect(response.status).toBe(401);
  }, 60_000);

  /** 발행 요청을 보내고 만들어진 문서 식별자를 받는다. */
  async function issue(): Promise<string> {
    const response = await handle(new Request("http://host/documents/issue", {
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
    const response = await handle(new Request(`http://host/documents/${documentId}/link`, {
      method: "POST",
      body: "{}",
    }));
    expect(response.status).toBe(200);
    return (await response.json() as { token: string }).token;
  }

  /** 토큰으로 문서를 연다. */
  async function view(token: string): Promise<{ status: string; pdfBase64: string }> {
    const response = await handle(
      new Request(`http://host/documents/view?token=${encodeURIComponent(token)}`),
    );
    expect(response.status).toBe(200);
    return await response.json() as { status: string; pdfBase64: string };
  }

  /** 서명을 접수한다. */
  async function sign(token: string): Promise<{ status: string }> {
    const response = await handle(new Request("http://host/documents/sign", {
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

/** 저장소에 이미 들어 있는 Pretendard TTF 폴더다. */
function pretendardDirectory(): string {
  return new URL(
    "../../../node_modules/pretendard/dist/public/static/alternative/",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1");
}
