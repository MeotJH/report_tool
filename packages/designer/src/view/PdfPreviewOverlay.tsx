import { useSyncExternalStore } from "react";
import type { DocumentPreview } from "../controller/DocumentPreview.js";

/**
 * 발행 직전의 PDF를 편집 화면 위에 그대로 띄운다.
 *
 * 브라우저가 가진 PDF 뷰어에 맡긴다(`iframe`). pdf.js를 넣으면 편집기 번들이
 * 커지고, 무엇보다 **우리가 다시 그린 그림**을 보게 된다 — 확인하려는 것은
 * 우리 그림이 아니라 발행본 파일 그 자체다.
 *
 * 캔버스와 발행본의 마지막 차이(글자 폭 소수점·자간·워터마크)는 이 창에서만
 * 드러난다.
 */
export function PdfPreviewOverlay(props: { preview: DocumentPreview }) {
  const state = useSyncExternalStore(
    (listener) => props.preview.subscribe(listener),
    () => props.preview.state(),
  );
  if (!state.isOpen()) return null;
  const url = state.documentUrl();
  return (
    <div className="rt-preview-overlay" role="dialog" aria-label="PDF 미리보기">
      <div className="rt-preview-window">
        <header className="rt-preview-bar">
          <span className="rt-preview-label">{state.label()}</span>
          <span className="rt-preview-actions">
            <button
              className="rt-filing-button"
              type="button"
              disabled={state.isWorking()}
              onClick={() => void props.preview.open()}
            >
              다시 만들기
            </button>
            <button
              className="rt-filing-button"
              type="button"
              onClick={() => props.preview.close()}
            >
              닫기
            </button>
          </span>
        </header>
        {url === null
          ? <p className="rt-preview-empty">{state.label()}</p>
          : <iframe className="rt-preview-frame" src={url} title="PDF 미리보기" />}
      </div>
    </div>
  );
}
