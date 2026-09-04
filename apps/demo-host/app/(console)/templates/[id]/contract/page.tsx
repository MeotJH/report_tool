"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

/** 계약 한 줄이다. 서버의 `TemplateContractReader`가 만든 모양 그대로다. */
interface ContractEntry {
  readonly path: string;
  readonly label: string;
  readonly type: string;
  readonly used: boolean;
  readonly declared: boolean;
  readonly inSample: boolean;
  readonly required: boolean;
  readonly sensitive: boolean;
}

interface Contract {
  readonly templateId: string;
  readonly version: number;
  readonly entries: readonly ContractEntry[];
  readonly sample: Record<string, unknown>;
}

/**
 * 이 양식이 호스트에게 무엇을 요구하는지 보여 준다.
 *
 * **읽는 사람이 다르다.** 앞의 화면들은 인사담당자가 보지만 이 화면은 호스트
 * 백엔드 개발자가 본다. 양식을 만드는 사람과 데이터를 주는 사람은 보통 다른
 * 팀이고 서로 말하지 않고 일한다. 양식에 칸이 하나 늘었다는 사실을 알 방법이
 * 없으면 그 칸은 빈칸으로 발행되고, 오류도 로그도 남지 않는다.
 *
 * 그래서 이 화면의 목적은 설명이 아니라 **복사**다. 샘플 JSON을 그대로 가져가
 * 값만 채우면 된다.
 */
export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/report-api/templates/${id}/contract`);
      if (!response.ok) {
        setError(`양식을 찾을 수 없습니다 (${response.status})`);
        return;
      }
      setContract(await response.json() as Contract);
    })();
  }, [id]);

  if (error !== "") return <div className="page"><p className="notice notice--warn">{error}</p></div>;
  if (contract === null) return <div className="page"><p>불러오는 중…</p></div>;

  const sampleText = JSON.stringify(contract.sample, null, 2);
  const missing = contract.entries.filter((entry) => entry.used && !entry.inSample);

  return (
    <div className="page">
      <div className="page-head">
        <h1>데이터 명세</h1>
        <p>
          <Link href="/templates">양식</Link> · {contract.templateId} v{contract.version} —
          호스트가 <code>resolve(templateId, recipientId)</code>에서 돌려줘야 하는 값입니다.
        </p>
      </div>

      {missing.length === 0
        ? null
        : (
          <p className="notice notice--warn">
            {missing.length}개 경로가 지금 샘플 데이터에 없습니다. 이 상태로 발행하면
            그 자리는 빈칸으로 나갑니다 — {missing.map((entry) => entry.path).join(", ")}
          </p>
        )}

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr><th>경로</th><th>이름</th><th>종류</th><th>상태</th></tr>
          </thead>
          <tbody>
            {contract.entries.map((entry) => (
              <tr key={entry.path}>
                <td>
                  <code>{entry.path}</code>
                  {entry.sensitive ? <span title="민감한 값"> 🔒</span> : null}
                </td>
                <td>{entry.label}</td>
                <td className="table-sub">{entry.type}</td>
                <td><EntryState entry={entry} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>샘플 JSON</strong>
          <button
            type="button"
            className="button"
            onClick={() => {
              void navigator.clipboard.writeText(sampleText).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "복사했습니다" : "복사"}
          </button>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            붙여넣고 값만 채우면 됩니다.
          </span>
        </div>
        <pre className="code">{sampleText}</pre>
      </div>
    </div>
  );
}

/**
 * 한 경로가 세 목록 중 어디에 있는지 보여 준다.
 *
 * 어긋남의 종류마다 위험이 다르다. 선언만 있는 것은 지워도 그만이지만, 샘플에
 * 없는 것은 **발행하면 빈칸**이고 선언이 없는 것은 호스트가 줘야 하는 줄도
 * 모르는 값이다.
 */
function EntryState(props: { entry: ContractEntry }) {
  const { entry } = props;
  if (!entry.used) return <span className="tag">문서에서 쓰지 않음</span>;
  if (!entry.inSample) return <span className="tag tag--warn">샘플에 없음 — 빈칸으로 발행됨</span>;
  if (!entry.declared) return <span className="tag tag--warn">선언되지 않음</span>;
  return <span className="tag tag--on">정상</span>;
}
