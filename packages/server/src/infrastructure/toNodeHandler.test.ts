import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { toNodeHandler } from "./toNodeHandler.js";

describe("toNodeHandler", () => {
  let running: Server | null = null;

  afterEach(async () => {
    if (running !== null) await new Promise<void>((resolve) => running?.close(() => resolve()));
    running = null;
  });

  it("메서드와 경로와 질의를 그대로 넘긴다", async () => {
    const seen: string[] = [];
    const base = await serve(async (request) => {
      seen.push(`${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`);
      return new Response("ok");
    });

    await fetch(`${base}/documents/view?token=abc`);

    expect(seen[0]).toBe("GET /documents/view?token=abc");
  });

  it("본문을 그대로 넘긴다", async () => {
    let body = "";
    const base = await serve(async (request) => {
      body = await request.text();
      return new Response("ok");
    });

    await fetch(`${base}/documents/issue`, { method: "POST", body: '{"templateId":"payslip"}' });

    expect(JSON.parse(body)["templateId"]).toBe("payslip");
  });

  it("상태 코드와 헤더를 그대로 내보낸다", async () => {
    const base = await serve(async () => new Response('{"id":"doc-1"}', {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));

    const response = await fetch(`${base}/documents/issue`, { method: "POST" });

    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect((await response.json() as { id: string }).id).toBe("doc-1");
  });

  it("바이너리 응답이 한 바이트도 바뀌지 않는다", async () => {
    const pdf = new Uint8Array([37, 80, 68, 70, 0, 255, 128]);
    const base = await serve(async () => new Response(pdf, {
      headers: { "Content-Type": "application/pdf" },
    }));

    const received = new Uint8Array(await (await fetch(`${base}/files/a.pdf`)).arrayBuffer());

    expect([...received]).toEqual([...pdf]);
  });

  it("한글 응답이 깨지지 않는다", async () => {
    const base = await serve(async () => new Response(
      JSON.stringify({ error: "발행되지 않은 템플릿은 발행할 수 없다" }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    ));

    const body = await (await fetch(`${base}/documents/issue`, { method: "POST" })).json();

    expect((body as { error: string }).error).toBe("발행되지 않은 템플릿은 발행할 수 없다");
  });

  it("핸들러가 터지면 500으로 답하고 이유를 남긴다", async () => {
    const base = await serve(async () => { throw new Error("호스트에 닿지 못했다"); });

    const response = await fetch(`${base}/documents/issue`, { method: "POST" });

    expect(response.status).toBe(500);
    expect(await response.text()).toContain("호스트에 닿지 못했다");
  });

  /** 주어진 핸들러로 서버를 띄우고 그 주소를 준다. */
  async function serve(handle: (request: Request) => Promise<Response>): Promise<string> {
    const server = createServer(toNodeHandler(handle));
    running = server;
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }
});
