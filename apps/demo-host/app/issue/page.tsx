"use client";

import { useState } from "react";

/** 호스트가 사이드카를 숨겨 둔 자리다. 브라우저는 호스트만 안다. */
const SIDECAR = "/api/report";

/**
 * 담당자가 받는 사람을 골라 발행하고 수신자 링크를 받는 화면이다.
 *
 * 호스트가 하는 일은 요청 두 번뿐이다 — 발행하고, 링크를 받는다. 그 사이의 데이터
 * 조회·PDF 생성·해시 동결·저장은 전부 사이드카가 한다.
 */
export default function IssuePage() {
  const [recipient, setRecipient] = useState("emp-1");
  const [link, setLink] = useState("");
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);

  /** 발행하고 링크를 만들어 화면에 띄운다. */
  const issue = async (): Promise<void> => {
    setBusy(true);
    setLog("발행하는 중… (데이터를 읽고 PDF를 만들어 해시를 동결합니다)");
    setLink("");
    try {
      const document = await call("/documents/issue", {
        templateId: "demo-payslip",
        recipientId: recipient,
        issuedBy: "admin",
      });
      const linked = await call(`/documents/${String(document["id"])}/link`, {});
      const url = new URL("/sign", location.href);
      url.searchParams.set("token", String(linked["token"]));
      setLink(url.toString());
      setLog(`문서 ${String(document["id"])} 발행됨 · 상태 ${String(document["status"])}`);
    } catch (error) {
      setLog(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ margin: "0 auto", maxWidth: 640, padding: 24 }}>
      <h1 style={{ fontSize: 20 }}>급여명세서 발행</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>
        <a href="/design">양식 설계</a>에서 저장하고 <strong>발행 가능으로 표시</strong>한
        뒤에 눌러야 합니다. 표시하지 않으면 사이드카가 거절합니다.
      </p>

      <div style={{ alignItems: "center", display: "flex", gap: 8, margin: "16px 0" }}>
        <select value={recipient} onChange={(event) => setRecipient(event.target.value)}>
          <option value="emp-1">홍길동 (개발지원팀)</option>
          <option value="emp-2">김서연 (인사팀)</option>
          <option value="emp-3">박준호 (영업팀)</option>
        </select>
        <button type="button" disabled={busy} onClick={() => { void issue(); }}>
          발행하고 링크 만들기
        </button>
      </div>

      {link === "" ? null : (
        <p>
          수신자 링크: <a href={link}>{link}</a>
        </p>
      )}
      <p style={{ color: "#64748b", fontSize: 13, whiteSpace: "pre-wrap" }}>{log}</p>
    </div>
  );
}

/** 사이드카에 JSON을 보내고 JSON을 받는다. 실패하면 이유를 그대로 올린다. */
async function call(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${SIDECAR}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return JSON.parse(text) as Record<string, unknown>;
}
