import { describe, expect, it } from "vitest";
import { SigningApiClient } from "./SigningApiClient.js";

describe("SigningApiClient.fetchDocument", () => {
  it("토큰을 인코딩해 열람 주소를 만든다", async () => {
    const calls: string[] = [];
    const client = new SigningApiClient("/api/report", recordingFetch(calls, viewBody()));

    await client.fetchDocument("가 나/다");

    expect(calls[0]).toBe("/api/report/documents/view?token=%EA%B0%80%20%EB%82%98%2F%EB%8B%A4");
  });

  it("주소 끝에 슬래시가 있어도 경로가 겹치지 않는다", async () => {
    const calls: string[] = [];
    const client = new SigningApiClient("/api/report/", recordingFetch(calls, viewBody()));

    await client.fetchDocument("t");

    expect(calls[0]).toBe("/api/report/documents/view?token=t");
  });

  it("base64로 온 PDF를 바이트로 되돌린다", async () => {
    const client = new SigningApiClient("/api", recordingFetch([], viewBody()));

    const { pdfBytes } = await client.fetchDocument("t");

    expect([...pdfBytes.slice(0, 4)]).toEqual([37, 80, 68, 70]);
  });

  it("문서 상태를 함께 준다", async () => {
    const client = new SigningApiClient("/api", recordingFetch([], viewBody()));

    expect((await client.fetchDocument("t")).status).toBe("viewed");
  });

  it("서버가 거절하면 상태 코드를 담아 알린다", async () => {
    const client = new SigningApiClient("/api", failingFetch(401, "토큰이 유효하지 않다"));

    await expect(client.fetchDocument("t")).rejects.toThrow("401");
  });

  it("서버가 남긴 이유도 함께 알린다", async () => {
    const client = new SigningApiClient("/api", failingFetch(401, "토큰이 유효하지 않다"));

    await expect(client.fetchDocument("t")).rejects.toThrow("토큰이 유효하지 않다");
  });
});

describe("SigningApiClient.submitSignature", () => {
  it("서명 흔적을 토큰과 함께 보낸다", async () => {
    const bodies: string[] = [];
    const client = new SigningApiClient("/api", recordingFetch([], signBody(), bodies));

    await client.submitSignature("t", {
      strokes: [{ points: [[1, 2]] }],
      imagePng: "iVBORw0KGgo=",
      authMethod: "email_link",
    });

    expect(JSON.parse(bodies[0] ?? "{}")).toEqual({
      token: "t",
      strokes: [{ points: [[1, 2]] }],
      imagePng: "iVBORw0KGgo=",
      authMethod: "email_link",
    });
  });

  it("서명 뒤의 문서 상태를 돌려준다", async () => {
    const client = new SigningApiClient("/api", recordingFetch([], signBody()));

    const status = await client.submitSignature("t", {
      strokes: [{ points: [[1, 2]] }],
      imagePng: "",
      authMethod: "email_link",
    });

    expect(status).toBe("signed");
  });

  it("서명이 거절되면 이유를 알린다", async () => {
    const client = new SigningApiClient("/api", failingFetch(422, "서명 흔적이 전혀 없다"));

    await expect(client.submitSignature("t", {
      strokes: [], imagePng: "", authMethod: "email_link",
    })).rejects.toThrow("서명 흔적이 전혀 없다");
  });
});

/** 열람 응답이다. `%PDF`로 시작하는 바이트를 base64로 담는다. */
function viewBody(): unknown {
  return { status: "viewed", pdfBase64: btoa("%PDF-1.7") };
}

/** 서명 응답이다. */
function signBody(): unknown {
  return { status: "signed" };
}

/** 어디로 무엇을 보냈는지 적어 두는 fetch다. */
function recordingFetch(
  urls: string[],
  body: unknown,
  bodies: string[] = [],
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    if (typeof init?.body === "string") bodies.push(init.body);
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

/** 서버가 거절하는 상황을 만든다. */
function failingFetch(status: number, reason: string): typeof fetch {
  return (async () => new Response(JSON.stringify({ error: reason }), { status })) as typeof fetch;
}
