import {
  DocumentHash,
  IssuedDocument,
  PageSpec,
  SignatureRecord,
  Template,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { HostApi } from "./HostApi.js";
import { HttpDataProvider } from "./HttpDataProvider.js";
import { HttpDocumentStore } from "./HttpDocumentStore.js";
import { HttpImageProvider } from "./HttpImageProvider.js";
import { HttpStorageAdapter } from "./HttpStorageAdapter.js";
import { HttpTemplateStore } from "./HttpTemplateStore.js";

describe("HostApi", () => {
  it("주소를 이어 붙인다. 끝 슬래시가 있어도 겹치지 않는다", async () => {
    const calls = recorder();
    const api = new HostApi({ baseUrl: "https://host/report-api/", fetch: calls.fetch });

    await api.json("GET", "/templates/payslip");

    expect(calls.urls[0]).toBe("https://host/report-api/templates/payslip");
  });

  it("호스트가 우리를 알아보도록 설정한 헤더를 함께 보낸다", async () => {
    const calls = recorder();
    const api = new HostApi({
      baseUrl: "https://host",
      fetch: calls.fetch,
      headers: { Authorization: "Bearer 사이드카열쇠" },
    });

    await api.json("GET", "/templates/payslip");

    expect(calls.headers[0]?.["Authorization"]).toBe("Bearer 사이드카열쇠");
  });

  it("호스트가 거절하면 상태 코드와 이유를 함께 올린다", async () => {
    const api = new HostApi({ baseUrl: "https://host", fetch: failing(503, "DB 점검 중") });

    await expect(api.json("GET", "/templates/payslip"))
      .rejects.toThrow("호스트가 요청을 거절했다 (503): DB 점검 중");
  });

  it("찾지 못한 것은 찾지 못했다고 말한다", async () => {
    const api = new HostApi({ baseUrl: "https://host", fetch: failing(404, "") });

    await expect(api.json("GET", "/templates/없음"))
      .rejects.toThrow("호스트에 없다: /templates/없음");
  });
});

describe("HttpTemplateStore", () => {
  it("발행할 템플릿을 호스트에서 받아 되살린다", async () => {
    const calls = recorder(template().toJSON());
    const store = new HttpTemplateStore(apiOf(calls.fetch));

    const found = await store.get("payslip");

    expect(found.name).toBe("급여명세서");
    expect(calls.urls[0]).toBe("https://host/templates/payslip");
  });

  it("버전을 지정하면 그 버전을 달라고 한다", async () => {
    const calls = recorder(template().toJSON());
    const store = new HttpTemplateStore(apiOf(calls.fetch));

    await store.get("payslip", 3);

    expect(calls.urls[0]).toBe("https://host/templates/payslip?version=3");
  });

  it("템플릿을 고치는 일은 사이드카가 하지 않는다고 분명히 말한다", async () => {
    const store = new HttpTemplateStore(apiOf(recorder().fetch));

    await expect(store.save(template()))
      .rejects.toThrow("사이드카는 템플릿을 고치지 않는다");
  });
});

describe("HttpDocumentStore", () => {
  it("발행 문서를 호스트에 넘긴다", async () => {
    const calls = recorder({});
    const store = new HttpDocumentStore(apiOf(calls.fetch));

    await store.create(issued());

    expect(calls.urls[0]).toBe("https://host/documents");
    expect(JSON.parse(calls.bodies[0] ?? "{}")["id"]).toBe("doc-1");
  });

  it("서명된 문서를 상태와 서명까지 되살려 받는다", async () => {
    const signed = issued().addSignature(signature());
    const store = new HttpDocumentStore(apiOf(recorder(signed.toJSON()).fetch));

    const found = await store.get("doc-1");

    expect(found.status).toBe("signed");
    expect(found.getSignatures()).toHaveLength(1);
  });

  it("상태가 바뀐 문서는 같은 자리에 덮어 쓴다", async () => {
    const calls = recorder({});
    const store = new HttpDocumentStore(apiOf(calls.fetch));

    await store.update(issued());

    expect(calls.methods[0]).toBe("PUT");
    expect(calls.urls[0]).toBe("https://host/documents/doc-1");
  });
});

describe("HttpDataProvider", () => {
  it("발행 데이터를 수신자별로 받아 온다", async () => {
    const calls = recorder({ employee: { name: "홍길동" } });
    const provider = new HttpDataProvider(apiOf(calls.fetch));

    const data = await provider.resolve("payslip", "emp-1");

    expect(calls.urls[0]).toBe("https://host/data/payslip/emp-1");
    expect(data).toEqual({ employee: { name: "홍길동" } });
  });

  it("미리보기 표본은 다른 자리에서 받는다", async () => {
    const calls = recorder({});
    const provider = new HttpDataProvider(apiOf(calls.fetch));

    await provider.sample("payslip");

    expect(calls.urls[0]).toBe("https://host/data/payslip/sample");
  });
});

describe("HttpStorageAdapter", () => {
  it("PDF 바이트를 그대로 올린다", async () => {
    const calls = recorder();
    const storage = new HttpStorageAdapter(apiOf(calls.fetch));

    await storage.put("documents/a/b.pdf", new Uint8Array([37, 80]), "application/pdf");

    expect(calls.methods[0]).toBe("PUT");
    expect(calls.urls[0]).toBe("https://host/files/documents/a/b.pdf");
  });

  it("열쇠에 든 특수문자는 조각마다 감싸되 경로 구분은 지킨다", async () => {
    const calls = recorder();
    const storage = new HttpStorageAdapter(apiOf(calls.fetch));

    await storage.put("문서/2026 08/a b.pdf", new Uint8Array([1]), "application/pdf");

    expect(calls.urls[0]).toBe("https://host/files/%EB%AC%B8%EC%84%9C/2026%2008/a%20b.pdf");
  });

  it("저장해 둔 바이트를 그대로 받는다", async () => {
    const storage = new HttpStorageAdapter(apiOf(binaryFetch(new Uint8Array([37, 80, 68, 70]))));

    expect([...(await storage.get("documents/a.pdf"))]).toEqual([37, 80, 68, 70]);
  });
});

describe("HttpImageProvider", () => {
  it("그림 바이트와 미디어 타입을 함께 받는다", async () => {
    const provider = new HttpImageProvider(
      apiOf(binaryFetch(new Uint8Array([137, 80]), "image/png")),
    );

    const asset = await provider.load("logo.png");

    expect(asset.mediaType).toBe("image/png");
    expect([...asset.bytes]).toEqual([137, 80]);
  });

  it("발행본이 임베딩할 수 없는 형식은 거절한다", async () => {
    const provider = new HttpImageProvider(
      apiOf(binaryFetch(new Uint8Array([1]), "image/svg+xml")),
    );

    await expect(provider.load("logo.svg"))
      .rejects.toThrow("발행본에 넣을 수 없는 그림 형식이다: image/svg+xml");
  });
});

/** 호출을 적어 두는 fetch와 그 기록이다. */
function recorder(body: unknown = {}): {
  fetch: typeof fetch;
  urls: string[];
  methods: string[];
  bodies: string[];
  headers: Record<string, string>[];
} {
  const urls: string[] = [];
  const methods: string[] = [];
  const bodies: string[] = [];
  const headers: Record<string, string>[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    methods.push(init?.method ?? "GET");
    if (typeof init?.body === "string") bodies.push(init.body);
    headers.push({ ...(init?.headers as Record<string, string> | undefined) });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { fetch: impl, urls, methods, bodies, headers };
}

/** 바이트를 돌려주는 fetch다. */
function binaryFetch(bytes: Uint8Array, contentType = "application/pdf"): typeof fetch {
  return (async () => new Response(bytes, {
    status: 200,
    headers: { "Content-Type": contentType },
  })) as typeof fetch;
}

/** 호스트가 거절하는 상황을 만든다. */
function failing(status: number, reason: string): typeof fetch {
  return (async () => new Response(reason, { status })) as typeof fetch;
}

/** 시험용 호스트 연결이다. */
function apiOf(impl: typeof fetch): HostApi {
  return new HostApi({ baseUrl: "https://host", fetch: impl });
}

/** 발행할 수 있는 템플릿이다. */
function template(): Template {
  return new Template({
    id: "payslip", name: "급여명세서", version: 1, status: "published",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}

/** 발행 문서 하나다. */
function issued(): IssuedDocument {
  return IssuedDocument.issue({
    id: "doc-1",
    templateId: "payslip",
    templateVersion: 1,
    recipientId: "emp-1",
    dataSnapshot: {},
    pdf: { storageKey: "documents/doc-1.pdf", sha256: new DocumentHash("a".repeat(64)), bytes: 4 },
    issuedAt: "2026-09-01T00:00:00.000Z",
    issuedBy: "admin",
  });
}

/** 그 문서에 걸린 서명이다. */
function signature(): SignatureRecord {
  return new SignatureRecord({
    signer: "employee",
    signerId: "emp-1",
    signedAt: "2026-09-02T00:00:00.000Z",
    documentHash: new DocumentHash("a".repeat(64)),
    strokes: [{ points: [[1, 2]] }],
    imagePng: "iVBORw0KGgo=",
    authMethod: "email_link",
  });
}
