// 담당자가 발행 대상을 골라 문서를 만들고 수신자 링크를 받는 화면이다.
//
// 호스트가 하는 일은 요청 두 번뿐이다 — 발행하고, 링크를 받는다. 그 사이의
// 데이터 조회·PDF 생성·해시 동결·저장은 전부 라이브러리가 한다.
const API = "/api/report";

const recipient = document.querySelector<HTMLSelectElement>("#recipient");
const issueButton = document.querySelector<HTMLButtonElement>("#issue");
const linkField = document.querySelector<HTMLInputElement>("#link");
const copyButton = document.querySelector<HTMLButtonElement>("#copy");
const openButton = document.querySelector<HTMLButtonElement>("#open");
const log = document.querySelector<HTMLElement>("#log");
if (
  recipient === null || issueButton === null || linkField === null
  || copyButton === null || openButton === null || log === null
) {
  throw new Error("페이지 구조가 예상과 다르다");
}

/** 서버에 JSON을 보내고 JSON을 받는다. 실패하면 이유를 그대로 올린다. */
async function call(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${API}${path}`, { method: "POST", body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return JSON.parse(text) as Record<string, unknown>;
}

// 호이스팅된 함수 선언에서는 위의 null 검사가 좁혀지지 않으므로, 확인이 끝난
// 요소들을 한 번 묶어 그것만 쓴다.
const ui = { recipient, issueButton, linkField, copyButton, openButton, log };

/** 발행하고 링크를 만들어 화면에 띄운다. */
const issue = async (): Promise<void> => {
  ui.issueButton.disabled = true;
  ui.log.textContent = "발행하는 중… (데이터를 읽고 PDF를 만들어 해시를 동결합니다)";
  try {
    const issued = await call("/documents/issue", {
      templateId: "demo-payslip",
      recipientId: ui.recipient.value,
      issuedBy: "admin",
    });
    const linked = await call(`/documents/${String(issued["id"])}/link`, {});
    const url = new URL("./viewer.html", location.href);
    url.searchParams.set("token", String(linked["token"]));
    ui.linkField.value = url.toString();
    ui.copyButton.disabled = false;
    ui.openButton.disabled = false;
    ui.log.textContent = `문서 ${String(issued["id"])} 발행됨 · 상태 ${String(issued["status"])}`;
  } catch (error) {
    ui.log.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    ui.issueButton.disabled = false;
  }
};

ui.issueButton.addEventListener("click", () => { void issue(); });

ui.copyButton.addEventListener("click", () => {
  void navigator.clipboard.writeText(ui.linkField.value)
    .then(() => { ui.log.textContent = "링크를 복사했습니다."; });
});

ui.openButton.addEventListener("click", () => { window.open(ui.linkField.value, "_blank"); });
