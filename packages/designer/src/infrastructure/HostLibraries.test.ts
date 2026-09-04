import { PageSpec, Template } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { HostEndpoint } from "./HostEndpoint.js";
import { HttpImageLibrary } from "./HttpImageLibrary.js";
import { HttpTemplateLibrary } from "./HttpTemplateLibrary.js";

describe("HostEndpoint", () => {
  it("주소 끝 슬래시가 있어도 경로가 겹치지 않는다", async () => {
    const calls = recorder([]);
    const endpoint = new HostEndpoint("/report-api/", calls.fetch);

    await endpoint.json("GET", "/templates");

    expect(calls.urls[0]).toBe("/report-api/templates");
  });

  it("호스트가 거절하면 상태 코드와 이유를 함께 올린다", async () => {
    const endpoint = new HostEndpoint("/report-api", failing(403, "권한이 없습니다"));

    await expect(endpoint.json("GET", "/templates"))
      .rejects.toThrow("호스트가 요청을 거절했다 (403): 권한이 없습니다");
  });

  it("호스트에 닿지 못하면 어디에 닿으려 했는지 말한다", async () => {
    const endpoint = new HostEndpoint(
      "/report-api",
      (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch,
    );

    await expect(endpoint.json("GET", "/templates"))
      .rejects.toThrow("호스트에 닿지 못했다 (GET /report-api/templates): Failed to fetch");
  });
});

describe("HttpTemplateLibrary", () => {
  it("열 수 있는 문서 목록을 호스트에서 받아 온다", async () => {
    const calls = recorder([{ id: "payslip", name: "급여명세서", updatedAt: "2026-09-01" }]);
    const library = new HttpTemplateLibrary(endpointOf(calls.fetch));

    const listed = await library.list();

    expect(calls.urls[0]).toBe("/report-api/templates");
    expect(listed.map((one) => one.name)).toEqual(["급여명세서"]);
  });

  it("고른 문서를 편집할 수 있는 형태로 되살린다", async () => {
    const calls = recorder(template().toJSON());
    const library = new HttpTemplateLibrary(endpointOf(calls.fetch));

    const loaded = await library.load("payslip");

    expect(calls.urls[0]).toBe("/report-api/templates/payslip");
    expect(loaded.name).toBe("급여명세서");
  });

  it("저장은 같은 식별자 자리에 덮어 쓴다", async () => {
    const calls = recorder({});
    const library = new HttpTemplateLibrary(endpointOf(calls.fetch));

    await library.save(template());

    expect(calls.methods[0]).toBe("PUT");
    expect(calls.urls[0]).toBe("/report-api/templates/payslip");
    expect(JSON.parse(calls.bodies[0] ?? "{}")["schemaVersion"]).toBe(2);
  });

  it("식별자에 든 특수문자를 감싼다", async () => {
    const calls = recorder(template().toJSON());
    const library = new HttpTemplateLibrary(endpointOf(calls.fetch));

    await library.load("급여 명세서");

    expect(calls.urls[0]).toBe("/report-api/templates/%EA%B8%89%EC%97%AC%20%EB%AA%85%EC%84%B8%EC%84%9C");
  });
});

describe("HttpImageLibrary", () => {
  it("그림을 올리고 호스트가 정한 식별자를 받는다", async () => {
    const calls = recorder({ assetId: "asset-1" });
    const library = new HttpImageLibrary(endpointOf(calls.fetch));

    const assetId = await library.upload(
      { bytes: new Uint8Array([137, 80]), mediaType: "image/png" },
      "logo.png",
    );

    expect(calls.methods[0]).toBe("POST");
    expect(assetId).toBe("asset-1");
  });

  it("파일 이름은 질의 문자열로 보낸다. 헤더에는 한글이 실리지 않는다", async () => {
    const calls = recorder({ assetId: "asset-1" });
    const library = new HttpImageLibrary(endpointOf(calls.fetch));

    await library.upload({ bytes: new Uint8Array([1]), mediaType: "image/png" }, "직인.png");

    expect(calls.urls[0]).toBe("/report-api/images?name=%EC%A7%81%EC%9D%B8.png");
  });

  it("올린 그림을 다시 받아 온다", async () => {
    const library = new HttpImageLibrary(endpointOf(binary(new Uint8Array([137, 80]), "image/png")));

    const asset = await library.load("asset-1");

    expect(asset.mediaType).toBe("image/png");
    expect([...asset.bytes]).toEqual([137, 80]);
  });

  it("발행본에 넣을 수 없는 형식은 받는 자리에서 막는다", async () => {
    const library = new HttpImageLibrary(endpointOf(binary(new Uint8Array([1]), "image/svg+xml")));

    await expect(library.load("asset-1"))
      .rejects.toThrow("발행본에 넣을 수 없는 그림 형식이다: image/svg+xml");
  });

  it("호스트가 식별자를 주지 않으면 올린 것으로 치지 않는다", async () => {
    const library = new HttpImageLibrary(endpointOf(recorder({}).fetch));

    await expect(library.upload(
      { bytes: new Uint8Array([1]), mediaType: "image/png" },
      "logo.png",
    )).rejects.toThrow("호스트가 그림 식별자를 주지 않았다");
  });
});

/** 호출을 적어 두는 fetch와 그 기록이다. */
function recorder(body: unknown): {
  fetch: typeof fetch;
  urls: string[];
  methods: string[];
  bodies: string[];
} {
  const urls: string[] = [];
  const methods: string[] = [];
  const bodies: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    methods.push(init?.method ?? "GET");
    if (typeof init?.body === "string") bodies.push(init.body);
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { fetch: impl, urls, methods, bodies };
}

/** 바이트를 돌려주는 fetch다. */
function binary(bytes: Uint8Array, contentType: string): typeof fetch {
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
function endpointOf(impl: typeof fetch): HostEndpoint {
  return new HostEndpoint("/report-api", impl);
}

/** 저장·복원 시험에 쓸 템플릿이다. */
function template(): Template {
  return new Template({
    id: "payslip", name: "급여명세서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}
