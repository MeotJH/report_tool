"use client";

import { PageSpec, Template } from "@report-tool/core";
import {
  Designer,
  HostEndpoint,
  HttpImageLibrary,
  HttpTemplateLibrary,
} from "@report-tool/designer";
import { useEffect, useRef, useState } from "react";

/** 호스트가 report-tool API를 열어 둔 자리다. 편집기와 사이드카가 함께 쓴다. */
const API = "/report-api";

/**
 * 담당자가 양식을 만드는 화면이다.
 *
 * 편집기는 호스트 페이지 안의 한 자리를 차지할 뿐이고, **저장은 호스트 API로 간다**
 * (`HttpTemplateLibrary`). 그 자리가 사이드카가 발행할 때 읽는 자리와 같아서,
 * 여기서 저장한 것이 그대로 발행된다.
 *
 * "발행 표시"를 따로 둔 이유는 사이드카가 `published`가 아닌 양식의 발행을 거절하기
 * 때문이다 — 만들다 만 양식이 직원에게 나가는 것을 막는 자리다.
 */
export default function DesignPage() {
  const container = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState("");

  useEffect(() => {
    const target = container.current;
    if (target === null) return;
    let designer: Designer | null = null;
    // 호스트에 저장된 양식이 있으면 그것으로 연다. 없으면 백지다.
    // 편집기를 만들기 전에 물어봐야 하므로 여기서 한 번 기다린다.
    void openDesigner(target).then((made) => { designer = made; });
    return () => designer?.destroy();
  }, []);

  /** 호스트에 저장된 양식이 있으면 그것으로, 없으면 백지로 편집기를 연다. */
  const openDesigner = async (target: HTMLElement): Promise<Designer> => {
    const endpoint = new HostEndpoint(`/api${API}`);
    const library = new HttpTemplateLibrary(endpoint);
    const saved = await library.load("demo-payslip").catch(() => null);
    return new Designer({
      container: target,
      template: saved ?? createBlankTemplate(),
      sampleData: {
        employee: { name: "홍길동", number: "073542", department: "개발지원팀", position: "팀장" },
        payments: [{ name: "기본급", amount: "3,200,000" }],
        deductions: [{ name: "소득세", amount: "115,530" }],
      },
      templateLibrary: library,
      imageLibrary: new HttpImageLibrary(endpoint),
    });
  };

  /** 데모 양식을 호스트에 넣고 화면을 다시 연다. */
  const seed = async (): Promise<void> => {
    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      const text = await response.text();
      setLog(response.ok ? `데모 양식을 넣었습니다. 새로고침하면 열립니다. ${text}` : text);
    } catch (error) {
      setLog(error instanceof Error ? error.message : String(error));
    }
  };

  /** 지금 양식을 발행 가능한 상태로 표시한다. */
  const publish = async (): Promise<void> => {
    try {
      const response = await fetch(`/api${API}/templates/demo-payslip/publish`, { method: "POST" });
      const text = await response.text();
      setLog(response.ok
        ? `발행 표시 완료 — 이제 /issue에서 발행할 수 있습니다. ${text}`
        : `발행 표시 실패 (${response.status}): ${text}`);
    } catch (error) {
      setLog(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="designer-page">
      <div className="designer-bar">
        <h1>양식 설계</h1>
        <button type="button" className="button" onClick={() => { void seed(); }}>
          데모 양식 넣기
        </button>
        <button type="button" className="button button--primary" onClick={() => { void publish(); }}>
          이 양식을 발행 가능으로 표시
        </button>
        {log === "" ? null : <p className="notice">{log}</p>}
      </div>
      <div ref={container} className="designer-stage" />
    </div>
  );
}

/**
 * 처음 여는 백지 양식이다.
 *
 * 식별자를 `demo-payslip`으로 고정한다. 데모에서 발행 화면이 부를 이름을 사람이
 * 옮겨 적지 않아도 되게 하기 위해서다.
 */
function createBlankTemplate(): Template {
  const now = new Date().toISOString();
  return new Template({
    id: "demo-payslip",
    name: "데모 급여명세서",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [15, 15, 15, 15]),
    fonts: ["Pretendard"],
    variables: [],
    elements: [],
    createdAt: now,
    updatedAt: now,
  });
}
