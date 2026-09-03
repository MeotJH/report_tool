/** 호스트 페이지의 CSS와 섞이지 않도록 Shadow DOM 안에서만 쓰는 규칙이다. */
export const VIEWER_CSS = `
  :host { color-scheme: light; display: block; }
  * { box-sizing: border-box; }
  button { font: inherit; }

  .rt-viewer {
    --rt-bg: #f5f7fb;
    --rt-panel: #ffffff;
    --rt-border: #e4e9f2;
    --rt-text: #172033;
    --rt-muted: #64748b;
    --rt-primary: #4f46e5;
    --rt-danger: #dc2626;
    background: var(--rt-bg);
    color: var(--rt-text);
    display: flex;
    flex-direction: column;
    font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    gap: 12px;
    min-height: 100%;
    padding: 12px;
  }

  .rt-viewer-message { color: var(--rt-muted); padding: 24px; text-align: center; }
  .rt-viewer-message--error { color: var(--rt-danger); }

  /* 쪽마다 캔버스 하나. 좁은 화면에서는 너비에 맞춰 줄인다. */
  .rt-viewer-pages { display: flex; flex-direction: column; gap: 10px; }
  .rt-viewer-page {
    background: #fff; border: 1px solid var(--rt-border); border-radius: 4px;
    box-shadow: 0 2px 10px rgb(15 23 42 / 8%); max-width: 100%;
  }

  /*
    서명칸은 문서 아래에 붙인다. 화면에 띄워 두면(sticky) 좁은 휴대폰에서 문서를
    가려, 무엇에 서명하는지 보지 못한 채 서명하게 된다.
  */
  .rt-viewer-sign {
    background: var(--rt-panel); border: 1px solid var(--rt-border); border-radius: 10px;
    display: flex; flex-direction: column; gap: 8px; padding: 12px;
  }
  .rt-viewer-sign-title { font-weight: 650; }
  .rt-viewer-sign-hint { color: var(--rt-muted); font-size: 12px; }
  .rt-viewer-pad {
    background: #fff; border: 1px dashed #94a3b8; border-radius: 8px; height: 160px;
    touch-action: none; width: 100%;
  }
  .rt-viewer-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .rt-viewer-button {
    background: var(--rt-panel); border: 1px solid var(--rt-border); border-radius: 8px;
    color: var(--rt-text); cursor: pointer; padding: 8px 14px;
  }
  .rt-viewer-button--primary {
    background: var(--rt-primary); border-color: var(--rt-primary); color: #fff;
  }
  .rt-viewer-button:disabled { background: var(--rt-bg); color: var(--rt-muted); cursor: default; }
  .rt-viewer-done {
    background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; color: #047857;
    padding: 14px; text-align: center;
  }
`;
