"use client";

import { Viewer } from "@report-tool/viewer";
import { useEffect, useRef, useState } from "react";

/** 호스트가 사이드카를 숨겨 둔 자리다. */
const SIDECAR = "/api/report";

/**
 * 수신자가 링크를 열었을 때 뜨는 화면이다.
 *
 * 호스트가 하는 일은 토큰을 읽어 `Viewer`에 넘기는 것뿐이다. 문서를 받아 오고
 * 그리고 서명을 접수하는 일은 전부 뷰어와 사이드카 사이에서 일어난다.
 */
export default function SignPage() {
  const container = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const target = container.current;
    if (target === null) return;
    const token = new URLSearchParams(location.search).get("token") ?? "";
    if (token === "") {
      setMessage("링크에 토큰이 없습니다. 발행 화면에서 만든 링크로 열어 주세요.");
      return;
    }
    const viewer = new Viewer({
      container: target,
      token,
      apiBaseUrl: SIDECAR,
      // 작업자 파일이 어디 놓이는지는 번들러가 정한다. Next는 이 경로로 낸다.
      pdfWorkerSrc: "/pdf.worker.min.mjs",
      onSigned: () => setMessage("서명이 접수되었습니다."),
    });
    return () => viewer.destroy();
  }, []);

  return (
    <div style={{ margin: "0 auto", maxWidth: 760 }}>
      {message === "" ? null : (
        <p style={{ color: "#64748b", padding: 16, textAlign: "center" }}>{message}</p>
      )}
      <div ref={container} />
    </div>
  );
}
