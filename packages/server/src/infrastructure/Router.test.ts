import { describe, expect, it } from "vitest";
import { Router } from "./Router.js";

describe("Router", () => {
  it("경로에 박힌 값을 꺼내 핸들러에 넘긴다", async () => {
    const router = new Router();
    router.add("POST", "/documents/:id/sign", async (_request, params) => (
      new Response(params["id"] ?? "")
    ));

    const response = await router.handle(post("http://host/documents/doc123/sign"));

    expect(await response.text()).toBe("doc123");
  });

  it("등록하지 않은 경로는 404로 답한다", async () => {
    const router = new Router();
    router.add("POST", "/documents/issue", async () => new Response("ok"));

    const response = await router.handle(post("http://host/documents/publish"));

    expect(response.status).toBe(404);
  });

  it("같은 경로라도 메서드가 다르면 매칭하지 않는다", async () => {
    const router = new Router();
    router.add("POST", "/documents/issue", async () => new Response("ok"));

    const response = await router.handle(new Request("http://host/documents/issue"));

    expect(response.status).toBe(404);
  });

  it("메서드는 대소문자를 가리지 않는다", async () => {
    const router = new Router();
    router.add("post", "/documents/issue", async () => new Response("ok"));

    const response = await router.handle(post("http://host/documents/issue"));

    expect(await response.text()).toBe("ok");
  });

  it("경로가 한 조각 더 길면 매칭하지 않는다", async () => {
    const router = new Router();
    router.add("GET", "/documents/:id", async () => new Response("ok"));

    const response = await router.handle(new Request("http://host/documents/doc1/sign"));

    expect(response.status).toBe(404);
  });

  it("질의 문자열은 경로 매칭에 끼어들지 않는다", async () => {
    const router = new Router();
    router.add("GET", "/documents/:id", async (_request, params) => (
      new Response(params["id"] ?? "")
    ));

    const response = await router.handle(new Request("http://host/documents/doc1?token=abc"));

    expect(await response.text()).toBe("doc1");
  });

  it("경로에 든 점이 아무 글자나 받아 주는 자리가 되지 않는다", async () => {
    const router = new Router();
    router.add("GET", "/health.check", async () => new Response("ok"));

    const response = await router.handle(new Request("http://host/healthXcheck"));

    expect(response.status).toBe(404);
  });

  it("먼저 등록한 경로가 이긴다", async () => {
    const router = new Router();
    router.add("GET", "/documents/new", async () => new Response("먼저"));
    router.add("GET", "/documents/:id", async () => new Response("나중"));

    const response = await router.handle(new Request("http://host/documents/new"));

    expect(await response.text()).toBe("먼저");
  });
});

/** 본문이 필요 없는 POST 요청을 짧게 만든다. */
function post(url: string): Request {
  return new Request(url, { method: "POST" });
}
