"use client";

import { PageSpec, Template } from "@report-tool/core";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/** 목록 한 줄이 보여 줄 것들이다. 호스트가 자기 DB에서 뽑는다. */
interface TemplateRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly version: number;
  readonly updatedAt: string;
}

const API = "/api/report-api";

/**
 * 양식 목록이다. 만들고 열고 지우고 발행 표시하는 자리다.
 *
 * **발행 표시를 편집기가 아니라 여기 둔 이유**가 있다. 그것은 편집이 아니라
 * "이 양식을 직원에게 보내도 된다"는 결재다. 편집 화면에 두면 고치던 손으로
 * 그대로 눌리고, 발행본은 되돌릴 수 없다.
 */
export default function TemplateListPage() {
  const [rows, setRows] = useState<readonly TemplateRow[]>([]);
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/templates`);
      setRows(await response.json() as TemplateRow[]);
    } catch (error) {
      setLog(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** 목록을 바꾸는 조작을 한 자리로 모은다. 끝나면 언제나 다시 읽는다. */
  const act = async (path: string, method: string, done: string): Promise<void> => {
    try {
      const response = await fetch(`${API}${path}`, { method });
      const text = await response.text();
      if (!response.ok) {
        const reason = text === "" ? `${response.status}` : parseError(text);
        setLog(reason);
        return;
      }
      setLog(done);
      await load();
    } catch (error) {
      setLog(error instanceof Error ? error.message : String(error));
    }
  };

  /**
   * 빈 양식을 만들고 바로 편집기로 간다.
   *
   * 저장 JSON을 손으로 쓰지 않고 `Template`에게 만들게 한다. 손으로 쓰면 필드
   * 이름 하나만 틀려도(`margin`을 `margins`로) 저장이 거절되는데, 그 오류는
   * "새 양식이 안 만들어진다"로만 보인다. 저장 형식의 근거는 언제나 `toJSON()`
   * 하나여야 한다.
   */
  const create = async (): Promise<void> => {
    const id = `template-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const blank = new Template({
      id, name: "새 양식", version: 1, status: "draft",
      page: new PageSpec("A4", "portrait", [15, 15, 15, 15]),
      fonts: ["Pretendard"], variables: [], elements: [],
      createdAt: now, updatedAt: now,
    });
    const response = await fetch(`${API}/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blank.toJSON()),
    });
    if (!response.ok) {
      setLog(`만들지 못했습니다 (${response.status})`);
      return;
    }
    location.href = `/design/${id}`;
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>양식</h1>
        <p>
          문서 양식을 만들고 관리합니다. <strong>발행 가능으로 표시</strong>한 양식만
          직원에게 발행할 수 있습니다.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="button button--primary" onClick={() => { void create(); }}>
          ＋ 새 양식
        </button>
        <button type="button" className="button" onClick={() => { void seed(setLog, load); }}>
          데모 급여명세서 넣기
        </button>
      </div>

      {log === "" ? null : <p className="notice">{log}</p>}

      <div className="card" style={{ padding: 0 }}>
        {loading
          ? <p style={{ color: "var(--muted)", margin: 0, padding: 18 }}>불러오는 중…</p>
          : rows.length === 0
            ? (
              <p style={{ color: "var(--muted)", margin: 0, padding: 18 }}>
                아직 양식이 없습니다. <strong>＋ 새 양식</strong>으로 시작하거나
                데모 급여명세서를 넣어 보세요.
              </p>
            )
            : (
              <table className="table">
                <thead>
                  <tr>
                    <th>이름</th><th>상태</th><th>판</th><th>수정</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <TemplateRowView key={row.id} row={row} act={act} />
                  ))}
                </tbody>
              </table>
            )}
      </div>
    </div>
  );
}

/** 목록 한 줄이다. 상태에 따라 할 수 있는 일이 다르다. */
function TemplateRowView(props: {
  row: TemplateRow;
  act: (path: string, method: string, done: string) => Promise<void>;
}) {
  const { row, act } = props;
  const published = row.status === "published";
  return (
    <tr>
      <td>
        <Link href={`/design/${row.id}`}>{row.name}</Link>
        <span className="table-sub">{row.id}</span>
      </td>
      <td>
        <span className={published ? "tag tag--on" : "tag"}>
          {published ? "발행 가능" : "초안"}
        </span>
      </td>
      <td>v{row.version}</td>
      <td className="table-sub">{row.updatedAt.slice(0, 10)}</td>
      <td className="table-actions">
        <Link className="button" href={`/templates/${row.id}/contract`}>데이터 명세</Link>
        {published
          ? (
            <>
              <button
                type="button"
                className="button"
                onClick={() => { void act(`/templates/${row.id}/unpublish`, "POST", "초안으로 되돌렸습니다."); }}
              >
                발행 취소
              </button>
              <button
                type="button"
                className="button"
                onClick={() => { void act(`/templates/${row.id}/next-version`, "POST", "새 버전을 만들었습니다."); }}
              >
                새 버전
              </button>
            </>
          )
          : (
            <button
              type="button"
              className="button button--primary"
              onClick={() => { void act(`/templates/${row.id}/publish`, "POST", "발행 가능으로 표시했습니다."); }}
            >
              발행 표시
            </button>
          )}
        <button
          type="button"
          className="button button--danger"
          onClick={() => {
            // 지운 양식은 되돌릴 수 없다. 되돌릴 수 없는 것 앞에서는 한 번 묻는다.
            if (!confirm(`${row.name}을(를) 지웁니다. 되돌릴 수 없습니다.`)) return;
            void act(`/templates/${row.id}`, "DELETE", "지웠습니다.");
          }}
        >
          삭제
        </button>
      </td>
    </tr>
  );
}

/** 데모 급여명세서를 넣는다. 호스트 계약이 아니라 데모 전용 자리다. */
async function seed(
  setLog: (message: string) => void,
  load: () => Promise<void>,
): Promise<void> {
  const response = await fetch("/api/demo/seed", { method: "POST" });
  setLog(response.ok ? "데모 급여명세서를 넣었습니다." : `넣지 못했습니다 (${response.status})`);
  await load();
}

/** 서버가 준 JSON 안의 사람이 읽을 문장을 꺼낸다. */
function parseError(text: string): string {
  try {
    const body = JSON.parse(text) as { error?: string };
    return body.error ?? text;
  } catch {
    return text;
  }
}
