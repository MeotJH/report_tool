import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSidecarServer } from "./createSidecarServer.js";
import { readSidecarEnv } from "./readSidecarEnv.js";

describe("createSidecarServer", () => {
  let server: Server;
  let base = "";

  beforeAll(async () => {
    server = createSidecarServer(readSidecarEnv({
      // 닿지 않는 주소를 준다. 라우팅이 컨트롤러까지 가는지만 보면 되고,
      // 호스트를 실제로 부르는 흐름은 SidecarEndToEnd 테스트가 확인한다.
      HOST_API_URL: "http://127.0.0.1:1",
      LINK_TOKEN_SECRET: "link-secret",
      BASE_PATH: "/report",
      // PORT는 기본값을 쓴다. 여기서는 빈 포트를 직접 잡아 띄우므로 설정값을
      // 쓰지 않는다 — 0은 "아무 포트나"라는 뜻이라 설정으로는 거절된다.
    }));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("살아 있는지 물어보면 답한다", async () => {
    const response = await fetch(`${base}/health`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("붙인 자리 밖은 404다", async () => {
    expect((await fetch(`${base}/documents/issue`, { method: "POST" })).status).toBe(404);
  });

  it("붙인 자리 안의 요청은 컨트롤러까지 간다", async () => {
    const response = await fetch(`${base}/report/documents/issue`, {
      method: "POST",
      body: JSON.stringify({ templateId: "payslip", recipientId: "emp-1", issuedBy: "admin" }),
    });

    // 호스트에 닿지 못했으므로 실패하지만, 400(요청이 잘못됨)이 아니라 422다.
    // 요청은 제대로 읽혔고 그 뒤에서 실패했다는 뜻이다.
    expect(response.status).toBe(422);
  });

  it("필수 값이 빠진 요청은 400으로 돌려보낸다", async () => {
    const response = await fetch(`${base}/report/documents/issue`, {
      method: "POST",
      body: JSON.stringify({ recipientId: "emp-1" }),
    });

    expect(response.status).toBe(400);
  });
});
