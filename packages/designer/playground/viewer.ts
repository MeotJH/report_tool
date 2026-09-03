// 수신자가 링크를 열었을 때의 화면을 그대로 재현한다.
//
// 실제 서비스에서는 담당자가 발행하고 링크를 문자·메일로 보낸다. 여기서는 페이지를
// 열 때마다 발행부터 한 번에 해서, 링크를 손으로 옮기지 않고도 끝까지 볼 수 있게 한다.
//
// 호스트가 하는 일은 셋뿐이다 — 발행을 부르고, 링크를 받고, `Viewer`를 띄운다.
import { Viewer } from "../../viewer/src/index.js";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const API = "/api/report";

const status = document.querySelector<HTMLElement>("#status");
const container = document.querySelector<HTMLElement>("#viewer");
if (status === null || container === null) throw new Error("페이지 구조가 예상과 다르다");

/** 서버에 JSON을 보내고 JSON을 받는다. 실패하면 이유를 그대로 올린다. */
async function call(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return JSON.parse(text) as Record<string, unknown>;
}

/**
 * 링크에 담겨 온 토큰을 쓴다. 없으면 그 자리에서 발행해 만든다.
 *
 * 실제로는 담당자가 발행 화면에서 만든 링크를 문자로 보낸다(`issue.html`).
 * 토큰 없이 열어도 화면을 볼 수 있게 둔 것은 확인을 위해서다 — 링크를 손으로
 * 옮기지 않고도 끝까지 볼 수 있어야 매번 확인하게 된다.
 */
async function resolveToken(): Promise<string> {
  const given = new URLSearchParams(location.search).get("token");
  if (given !== null && given !== "") return given;
  const issued = await call("/documents/issue", {
    templateId: "demo-payslip",
    recipientId: new URLSearchParams(location.search).get("recipient") ?? "emp-1",
    issuedBy: "admin",
  });
  const linked = await call(`/documents/${String(issued["id"])}/link`, {});
  return String(linked["token"]);
}

try {
  const token = await resolveToken();
  status.textContent = "수신자 링크로 열었습니다";
  new Viewer({
    container,
    token,
    apiBaseUrl: API,
    pdfWorkerSrc,
    onSigned: () => { status.textContent = "서명이 접수되었습니다."; },
  });
} catch (error) {
  status.textContent = error instanceof Error ? error.message : String(error);
}
