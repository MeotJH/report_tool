"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** 호스트가 사이드카를 숨겨 둔 자리다. 브라우저는 호스트만 안다. */
const SIDECAR = "/api/report";

/**
 * 담당자가 받는 사람을 골라 발행하고 수신자 링크를 받는 화면이다.
 *
 * 호스트가 하는 일은 요청 두 번뿐이다 — 발행하고, 링크를 받는다. 그 사이의 데이터
 * 조회·PDF 생성·해시 동결·저장은 전부 사이드카가 한다.
 */
export default function IssuePage() {
  const [templates, setTemplates] = useState<readonly PublishedTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [recipient, setRecipient] = useState("emp-1");
  const [link, setLink] = useState("");
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);

  // 발행 가능으로 표시한 양식만 고를 수 있다. 초안을 고를 수 있게 두면 사이드카가
  // 거절하고, 담당자는 왜 거절됐는지 이 화면에서 알 수 없다.
  useEffect(() => {
    void (async () => {
      const rows = await (await fetch("/api/report-api/templates")).json() as PublishedTemplate[];
      const published = rows.filter((row) => row.status === "published");
      setTemplates(published);
      setTemplateId(published[0]?.id ?? "");
    })();
  }, []);

  /** 발행하고 링크를 만들어 화면에 띄운다. */
  const issue = async (): Promise<void> => {
    setBusy(true);
    setLog("발행하는 중… (데이터를 읽고 PDF를 만들어 해시를 동결합니다)");
    setLink("");
    try {
      const document = await call("/documents/issue", {
        templateId,
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
    <div className="page">
      <div className="page-head">
        <h1>발행</h1>
        <p>
          <Link href="/templates">양식</Link>에서 <strong>발행 가능으로 표시</strong>한
          것만 여기에 나옵니다.
        </p>
      </div>

      {templates.length === 0
        ? (
          <p className="notice notice--warn">
            발행 가능한 양식이 없습니다. <Link href="/templates">양식</Link>에서
            <strong> 발행 표시</strong>를 먼저 누르세요.
          </p>
        )
        : null}

      <div className="card" style={{ alignItems: "center", display: "flex", gap: 10 }}>
        <select
          className="button"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          {templates.map((row) => (
            <option key={row.id} value={row.id}>{row.name} (v{row.version})</option>
          ))}
        </select>
        <select
          className="button"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
        >
          <option value="emp-1">홍길동 (개발지원팀)</option>
          <option value="emp-2">김서연 (인사팀)</option>
          <option value="emp-3">박준호 (영업팀)</option>
        </select>
        <button
          type="button"
          className="button button--primary"
          disabled={busy || templateId === ""}
          onClick={() => { void issue(); }}
        >
          발행하고 링크 만들기
        </button>
      </div>

      {link === "" ? null : (
        <div className="card">
          <p style={{ margin: "0 0 6px" }}><strong>수신자 링크</strong></p>
          <a href={link} style={{ fontSize: 13, wordBreak: "break-all" }}>{link}</a>
        </div>
      )}
      {log === "" ? null : <p className="notice" style={{ whiteSpace: "pre-wrap" }}>{log}</p>}
    </div>
  );
}

/** 목록에서 고를 수 있는 양식 하나다. */
interface PublishedTemplate {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly version: number;
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
