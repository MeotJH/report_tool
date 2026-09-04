"use client";

import Link from "next/link";
import {
  Designer,
  HostEndpoint,
  HttpImageLibrary,
  HttpTemplateLibrary,
} from "@report-tool/designer";
import { use, useEffect, useRef, useState } from "react";

/** 호스트가 report-tool API를 열어 둔 자리다. 편집기와 사이드카가 함께 쓴다. */
const API = "/api/report-api";

/**
 * 담당자가 양식 하나를 만드는 화면이다.
 *
 * 편집기는 호스트 페이지 안의 한 자리를 차지할 뿐이고, **저장은 호스트 API로 간다**
 * (`HttpTemplateLibrary`). 그 자리가 사이드카가 발행할 때 읽는 자리와 같아서,
 * 여기서 저장한 것이 그대로 발행된다.
 *
 * **발행 표시 버튼은 여기 없다.** 그것은 편집이 아니라 "이 양식을 직원에게 보내도
 * 된다"는 결재라서 목록 화면에 있다. 고치던 손으로 그대로 눌리면 안 된다.
 */
export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState(id);

  useEffect(() => {
    const target = container.current;
    if (target === null) return;
    let designer: Designer | null = null;
    let disposed = false;
    void open(target, id).then((made) => {
      if (disposed) { made?.destroy(); return; }
      designer = made;
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { disposed = true; designer?.destroy(); };

    /** 호스트에서 이 양식을 받아 편집기를 연다. 없으면 열지 않는다. */
    async function open(target: HTMLElement, templateId: string): Promise<Designer> {
      const endpoint = new HostEndpoint(API);
      const library = new HttpTemplateLibrary(endpoint);
      const template = await library.load(templateId);
      setName(template.name);
      return new Designer({
        container: target,
        template,
        sampleData: DEMO_SAMPLE,
        templateLibrary: library,
        imageLibrary: new HttpImageLibrary(endpoint),
      });
    }
  }, [id]);

  return (
    <div className="designer-page">
      <div className="designer-bar">
        <Link className="button" href="/templates">← 양식</Link>
        <h1>{name}</h1>
        <Link className="button" href={`/templates/${id}/contract`}>데이터 명세</Link>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          저장은 호스트 API(<code>/report-api</code>)로 갑니다.
        </span>
      </div>
      {error === "" ? null : <p className="notice notice--warn" style={{ padding: 16 }}>{error}</p>}
      <div ref={container} className="designer-stage" />
    </div>
  );
}

/**
 * 편집 중 미리보기에 쓸 샘플이다.
 *
 * 실제 호스트라면 로그인한 담당자가 볼 수 있는 아무 직원 한 명의 데이터를
 * 마스킹해 넘긴다. **라이브러리는 이것을 저장하지도 발행에 쓰지도 않는다.**
 */
const DEMO_SAMPLE = {
  employee: { name: "홍길동", number: "073542", department: "개발지원팀", position: "팀장" },
  payments: [
    { name: "기본급", amount: "3,200,000" },
    { name: "연장근로수당", amount: "379,728" },
  ],
  deductions: [{ name: "소득세", amount: "115,530" }],
};
