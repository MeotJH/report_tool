/** Shadow DOM 안에서만 적용되는 현대적인 편집기 시각 규칙을 설치한다. */
export class DesignerStyles {
  private static readonly STYLE_ATTRIBUTE = "data-report-tool-designer-style";

  /** 같은 Shadow Root에 중복 스타일을 만들지 않고 편집기 테마를 추가한다. */
  static mount(shadowRoot: ShadowRoot): void {
    if (shadowRoot.querySelector(`[${DesignerStyles.STYLE_ATTRIBUTE}]`) !== null) return;
    const style = document.createElement("style");
    style.setAttribute(DesignerStyles.STYLE_ATTRIBUTE, "");
    style.textContent = DESIGNER_CSS;
    shadowRoot.append(style);
  }
}

/** 호스트 CSS와 독립적인 색상·간격·상태 표현을 선언한 정적 테마다. */
const DESIGNER_CSS = `
  :host { color-scheme: light; display: block; }
  * { box-sizing: border-box; }
  button, input, select, textarea { font: inherit; }

  /*
    호스트가 준 높이를 편집기까지 그대로 전달한다.
    중간 요소의 높이가 auto면 편집기의 height: 100%가 내용 높이로 풀려서
    좌측 패널이 길어질 때마다 편집기 전체가 화면 밖으로 자란다.
  */
  [data-designer-root] { height: 100%; min-height: 0; }
  [data-designer-keyboard-root]:focus { outline: none; }

  .rt-designer {
    --rt-bg: #f5f7fb;
    --rt-panel: #ffffff;
    --rt-border: #e4e9f2;
    --rt-border-strong: #cbd5e1;
    --rt-text: #172033;
    --rt-muted: #64748b;
    --rt-primary: #4f46e5;
    --rt-primary-soft: #eef2ff;
    --rt-danger: #dc2626;
    --rt-warning: #b45309;
    background: var(--rt-bg);
    border: 1px solid var(--rt-border);
    border-radius: 16px;
    box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
    color: var(--rt-text);
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    font-family: Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    height: 100%;
    min-height: 640px;
    min-width: 1080px;
    overflow: hidden;
    /* 미리보기 창이 편집기 안쪽에만 덮이도록 기준점을 여기 둔다. */
    position: relative;
  }

  .rt-header {
    align-items: center;
    background: var(--rt-panel);
    border-bottom: 1px solid var(--rt-border);
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
  }
  .rt-brand, .rt-document-meta, .rt-toolbar-group, .rt-status-group { align-items: center; display: flex; }
  .rt-brand { gap: 10px; }
  .rt-document-meta { gap: 8px; }
  .rt-brand-mark {
    align-items: center; background: var(--rt-primary); border-radius: 9px; color: #fff;
    display: flex; font-weight: 700; height: 30px; justify-content: center; width: 30px;
  }
  .rt-brand-copy { display: flex; flex-direction: column; line-height: 1.25; }
  .rt-brand-title { font-weight: 650; }
  .rt-brand-subtitle { color: var(--rt-muted); font-size: 11px; }
  .rt-meta-pill {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 999px;
    color: var(--rt-muted); padding: 4px 10px;
  }

  /* 문서 이름·저장 상태·열기를 머리줄 한 자리에 모은다. */
  .rt-filing { align-items: center; display: flex; gap: 6px; position: relative; }
  .rt-filing-name {
    background: var(--rt-panel); border: 1px solid var(--rt-border); border-radius: 6px;
    color: var(--rt-text); font: inherit; padding: 4px 8px; width: 180px;
  }
  .rt-filing-name:focus { border-color: var(--rt-primary); outline: none; }
  .rt-filing-save {
    background: var(--rt-primary); border: 1px solid var(--rt-primary); border-radius: 6px;
    color: #fff; cursor: pointer; font: inherit; padding: 4px 12px;
  }
  .rt-filing-save:disabled { background: var(--rt-bg); border-color: var(--rt-border); color: var(--rt-muted); cursor: default; }
  .rt-filing-button {
    background: var(--rt-panel); border: 1px solid var(--rt-border); border-radius: 6px;
    color: var(--rt-text); cursor: pointer; font: inherit; padding: 4px 10px;
  }
  .rt-filing-state { color: var(--rt-muted); font-size: 11px; }
  .rt-filing-state--warn { color: var(--rt-warning); font-weight: 600; }
  .rt-filing-open { position: relative; }
  .rt-filing-menu {
    background: var(--rt-panel); border: 1px solid var(--rt-border-strong); border-radius: 8px;
    box-shadow: 0 8px 24px rgb(15 23 42 / 12%); display: flex; flex-direction: column; gap: 4px;
    left: 0; max-height: 320px; overflow-y: auto; padding: 8px; position: absolute;
    top: calc(100% + 6px); width: 260px; z-index: 20;
  }
  .rt-filing-warn { color: var(--rt-warning); font-size: 11px; margin: 0 0 4px; }
  .rt-filing-empty { color: var(--rt-muted); font-size: 11px; margin: 0; }
  .rt-filing-item {
    background: none; border: 1px solid transparent; border-radius: 6px; cursor: pointer;
    display: flex; font: inherit; gap: 8px; justify-content: space-between; padding: 6px 8px;
    text-align: left;
  }
  .rt-filing-item:hover { background: var(--rt-primary-soft); border-color: var(--rt-border); }
  .rt-filing-item-name { color: var(--rt-text); }
  .rt-filing-item-time { color: var(--rt-muted); font-size: 11px; }

  /* 파일 고르기는 input을 감춘 라벨로 만든다. 브라우저 기본 모양은 패널과 맞지 않는다. */
  .rt-image-pick { display: flex; flex-direction: column; gap: 4px; }
  .rt-image-pick-button {
    background: var(--rt-primary-soft); border: 1px solid var(--rt-border); border-radius: 6px;
    color: var(--rt-primary); cursor: pointer; padding: 6px 10px; text-align: center;
  }
  .rt-image-pick-button input { display: none; }

  /* 미리보기는 편집 화면 위를 덮는다. 옆에 두면 종이가 반으로 줄어 볼 수 없다. */
  .rt-preview-overlay {
    align-items: center; background: rgb(15 23 42 / 55%); bottom: 0; display: flex;
    justify-content: center; left: 0; position: absolute; right: 0; top: 0; z-index: 40;
  }
  .rt-preview-window {
    background: var(--rt-panel); border-radius: 10px; display: flex; flex-direction: column;
    height: 92%; overflow: hidden; width: 76%;
  }
  .rt-preview-bar {
    align-items: center; border-bottom: 1px solid var(--rt-border); display: flex;
    justify-content: space-between; padding: 8px 12px;
  }
  .rt-preview-label { color: var(--rt-muted); font-size: 12px; }
  .rt-preview-actions { display: flex; gap: 6px; }
  .rt-preview-frame { border: 0; flex: 1; width: 100%; }
  .rt-preview-empty { color: var(--rt-muted); margin: auto; padding: 24px; }

  .rt-toolbar {
    align-items: center; background: var(--rt-panel); border-bottom: 1px solid var(--rt-border);
    display: flex; gap: 12px; justify-content: space-between; padding: 8px 16px;
  }
  .rt-toolbar-group { gap: 4px; }
  .rt-toolbar-divider { background: var(--rt-border); height: 20px; margin: 0 4px; width: 1px; }
  .rt-tool-button {
    align-items: center; background: transparent; border: 1px solid transparent; border-radius: 9px;
    color: var(--rt-text); cursor: pointer; display: flex; gap: 6px; padding: 6px 10px;
  }
  .rt-tool-button:hover:not(:disabled) { background: var(--rt-bg); }
  .rt-tool-button[aria-pressed="true"] {
    background: var(--rt-primary-soft); border-color: #c7d2fe; color: var(--rt-primary);
  }
  .rt-tool-button:disabled { color: #b6c0cf; cursor: not-allowed; }
  .rt-tool-button--danger:hover:not(:disabled) { background: #fef2f2; color: var(--rt-danger); }
  .rt-tool-icon { font-size: 14px; line-height: 1; width: 14px; text-align: center; }
  .rt-tool-label { font-size: 12px; }

  .rt-workspace {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 296px;
    min-height: 0;
  }
  .rt-panel {
    background: var(--rt-panel); display: flex; flex-direction: column;
    min-height: 0; overflow: hidden;
  }
  .rt-panel--left { border-right: 1px solid var(--rt-border); }
  .rt-panel-head {
    align-items: center; border-bottom: 1px solid var(--rt-border); display: flex;
    justify-content: space-between; padding: 10px 12px;
  }
  .rt-panel-title { font-size: 12px; font-weight: 650; }
  .rt-panel-count { color: var(--rt-muted); font-size: 11px; }
  .rt-panel-button {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 7px;
    color: var(--rt-text); cursor: pointer; flex: 1; padding: 6px 8px; font-size: 11px;
  }
  .rt-panel-button:hover:not(:disabled) { border-color: var(--rt-border-strong); }
  .rt-panel-button:disabled { color: #b6c0cf; cursor: not-allowed; }
  .rt-button-row { display: flex; gap: 6px; }
  .rt-icon-button {
    background: transparent; border: 1px solid transparent; border-radius: 6px; color: var(--rt-muted);
    cursor: pointer; flex: none; line-height: 1; padding: 4px 6px;
  }
  .rt-icon-button:hover:not(:disabled) { background: var(--rt-bg); }
  .rt-icon-button--on { color: var(--rt-primary); }
  .rt-icon-button:disabled { color: #cbd5e1; cursor: not-allowed; }

  .rt-layers { display: flex; flex-direction: column; max-height: 45%; min-height: 0; }
  .rt-layer-list { list-style: none; margin: 0; overflow-y: auto; padding: 6px; }
  .rt-layer-row {
    align-items: center; border: 1px solid transparent; border-radius: 8px; display: flex; gap: 2px;
  }
  .rt-layer-row:hover { background: var(--rt-bg); }
  .rt-layer-row--selected {
    background: var(--rt-primary-soft); border-color: #c7d2fe;
  }
  .rt-layer-row--hidden .rt-layer-name { color: #b6c0cf; text-decoration: line-through; }
  .rt-layer-row--locked .rt-layer-icon { color: var(--rt-muted); }
  .rt-layer-main {
    align-items: center; background: transparent; border: none; cursor: pointer; display: flex;
    flex: 1; gap: 8px; min-width: 0; padding: 6px 4px; text-align: left; color: inherit;
  }
  .rt-layer-icon {
    color: var(--rt-primary); flex: none; font-size: 12px; text-align: center; width: 14px;
  }
  .rt-layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rt-layer-flag {
    background: #fef3c7; border-radius: 999px; color: var(--rt-warning); flex: none;
    font-size: 10px; font-weight: 700; padding: 1px 6px;
  }

  .rt-palette-scroll { display: flex; flex: 1; flex-direction: column; gap: 3px; min-height: 0; overflow-y: auto; }
  .rt-palette-group-title {
    color: var(--rt-muted); font-size: 10px; font-weight: 650; letter-spacing: 0.04em;
    margin: 10px 2px 2px; text-transform: uppercase;
  }
  .rt-entry-row { align-items: center; display: flex; gap: 2px; }
  .rt-entry-row--on > .rt-field-button, .rt-entry-row--on > .rt-array-button {
    border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.16);
  }
  .rt-entry-row > .rt-field-button, .rt-entry-row > .rt-array-button { flex: 1; min-width: 0; }
  .rt-type-badge--declared {
    background: #ecfdf5; border-color: #a7f3d0; color: #047857;
  }
  .rt-type-badge--constant {
    background: #fffbeb; border-color: #fcd34d; color: var(--rt-warning);
  }

  .rt-variable-editor {
    background: var(--rt-bg); border: 1px solid var(--rt-border-strong); border-radius: 10px;
    display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; padding: 10px;
  }
  .rt-variable-kinds { display: flex; gap: 2px; }
  .rt-variable-kinds .rt-segment { flex: 1; }
  .rt-variable-help { color: var(--rt-muted); font-size: 10px; line-height: 1.5; margin: 0; }
  .rt-variable-field { display: flex; flex-direction: column; gap: 3px; }
  .rt-variable-field input, .rt-variable-field select {
    background: #fff; border: 1px solid var(--rt-border); border-radius: 7px;
    padding: 5px 7px; width: 100%;
  }
  .rt-variable-field input:focus, .rt-variable-field select:focus {
    border-color: var(--rt-primary); outline: none;
  }
  .rt-variable-check {
    align-items: center; color: var(--rt-muted); display: flex; font-size: 11px; gap: 6px;
  }
  .rt-child-list { display: flex; flex-direction: column; gap: 5px; }
  /* 엑셀에서 복사한 표를 붙여넣는 자리. 탭이 보이도록 등폭 글꼴을 쓴다. */
  .rt-grid-paste {
    border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px;
    padding: 6px; resize: vertical; white-space: pre; width: 100%;
  }
  .rt-child-row { align-items: center; display: flex; gap: 3px; }
  .rt-child-row input, .rt-child-row select {
    background: #fff; border: 1px solid var(--rt-border); border-radius: 6px;
    font-size: 11px; min-width: 0; padding: 4px 5px; width: 100%;
  }
  .rt-child-row select { flex: none; width: 68px; }
  .rt-panel-button--primary {
    background: var(--rt-primary); border-color: var(--rt-primary); color: #fff;
  }

  .rt-field-palette {
    border-top: 1px solid var(--rt-border); display: flex; flex: 1; flex-direction: column;
    min-height: 0; padding: 10px 12px 12px;
  }
  .rt-palette-heading { display: flex; flex-direction: column; gap: 4px; }
  .rt-palette-title-row { align-items: center; display: flex; justify-content: space-between; }
  .rt-palette-title { font-size: 12px; }
  .rt-field-count { color: var(--rt-muted); font-size: 11px; }
  .rt-palette-help { color: var(--rt-muted); font-size: 11px; line-height: 1.5; margin: 2px 0 8px; }
  .rt-mode-switch {
    background: var(--rt-primary-soft); border: 1px solid #c7d2fe; border-radius: 7px;
    color: var(--rt-primary); cursor: pointer; margin-bottom: 8px; padding: 6px;
  }
  .rt-placement-notice {
    align-items: center; background: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px;
    color: #c2410c; display: flex; font-size: 11px; gap: 6px; margin-bottom: 8px; padding: 6px 8px;
  }
  .rt-search { align-items: center; display: flex; gap: 6px; margin-bottom: 8px; position: relative; }
  .rt-search-icon { color: var(--rt-muted); left: 8px; position: absolute; }
  .rt-search-input {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 8px;
    padding: 6px 8px 6px 26px; width: 100%;
  }
  .rt-search-input:focus { border-color: var(--rt-primary); outline: none; }
  .rt-field-list { display: flex; flex: 1; flex-direction: column; gap: 3px; overflow-y: auto; }
  .rt-field-group { display: flex; flex-direction: column; gap: 3px; }
  .rt-field-group > .rt-field-list {
    border-left: 1px solid var(--rt-border); margin-left: 8px; padding-left: 8px;
  }
  .rt-array-button {
    align-items: center; background: var(--rt-primary-soft); border: 1px solid #c7d2fe;
    border-radius: 8px; color: var(--rt-primary); cursor: grab; display: flex; gap: 8px;
    padding: 6px 8px; text-align: left; width: 100%;
  }
  .rt-array-button:hover:not(:disabled) { border-color: var(--rt-primary); }
  .rt-array-button:disabled { cursor: default; opacity: 0.7; }
  .rt-array-copy { display: flex; flex: 1; flex-direction: column; min-width: 0; }
  .rt-array-label { font-size: 12px; font-weight: 600; }

  .rt-field-button {
    align-items: center; background: var(--rt-panel); border: 1px solid var(--rt-border);
    border-radius: 8px; cursor: grab; display: flex; gap: 8px; padding: 6px 8px; text-align: left;
    color: inherit;
  }
  .rt-field-button:hover { border-color: var(--rt-primary); background: var(--rt-primary-soft); }
  .rt-field-copy { display: flex; flex: 1; flex-direction: column; min-width: 0; }
  .rt-field-label { align-items: center; display: flex; font-size: 12px; gap: 4px; }
  .rt-field-path {
    color: var(--rt-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .rt-field-action { color: var(--rt-primary); font-size: 10px; }
  .rt-type-badge {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 999px;
    color: var(--rt-muted); font-size: 10px; padding: 1px 7px;
  }
  .rt-empty { color: var(--rt-muted); font-size: 11px; padding: 12px; text-align: center; }

  /* 처음 쓰는 사람에게 다음 할 일 하나를 캔버스 바로 위에 둔다. */
  .rt-onboarding {
    align-items: center; background: var(--rt-primary-soft); border-bottom: 1px solid #c7d2fe;
    display: flex; font-size: 12px; gap: 10px; padding: 7px 14px;
  }
  .rt-onboarding-marks { display: flex; gap: 4px; }
  .rt-onboarding-mark {
    align-items: center; background: var(--rt-panel); border: 1px solid var(--rt-border);
    border-radius: 999px; color: var(--rt-muted); display: flex; font-size: 10px;
    height: 18px; justify-content: center; width: 18px;
  }
  .rt-onboarding-mark--now { background: var(--rt-primary); border-color: var(--rt-primary); color: #fff; }
  .rt-onboarding-mark--done { color: var(--rt-primary); }
  .rt-onboarding-now { color: var(--rt-text); flex: 1; }
  .rt-onboarding-close {
    background: none; border: 0; color: var(--rt-muted); cursor: pointer; padding: 2px 6px;
  }

  .rt-canvas-panel { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  .rt-canvas-topbar {
    align-items: center; background: var(--rt-panel); border-bottom: 1px solid var(--rt-border);
    color: var(--rt-muted); display: flex; font-size: 11px; gap: 12px;
    justify-content: space-between; padding: 7px 14px;
  }
  .rt-canvas-mode { color: var(--rt-text); flex: 1; text-align: center; }
  .rt-zoom-controls { align-items: center; display: flex; gap: 4px; }
  .rt-page-controls { align-items: center; display: flex; gap: 4px; }
  .rt-page-value { align-items: center; color: var(--rt-text); display: flex; gap: 6px; min-width: 52px; justify-content: center; }
  .rt-page-note {
    background: var(--rt-primary-soft); border-radius: 999px; color: var(--rt-primary);
    font-size: 10px; padding: 1px 6px;
  }
  .rt-zoom-value { min-width: 40px; text-align: center; }
  .rt-canvas-viewport {
    display: flex; flex: 1; min-height: 0; overflow: auto; padding: 32px;
    position: relative;
  }
  /*
    중앙 정렬을 justify-content가 아니라 margin으로 하는 이유:
    flex 중앙 정렬은 내용이 넘칠 때 시작 쪽을 잘라내 스크롤로도 닿을 수 없게 만든다.
    확대했을 때 페이지 왼쪽 끝이 사라지는 문제가 여기서 나온다.
  */
  .rt-canvas-page { flex: none; margin: auto; position: relative; }
  .rt-canvas-page[data-panning] { cursor: grab; }
  .rt-canvas-page[data-field-drag-active] { outline: 2px dashed var(--rt-primary); outline-offset: 4px; }
  .rt-drop-overlay {
    background: rgba(79, 70, 229, 0.92); border-radius: 999px; bottom: 18px; color: #fff;
    font-size: 11px; left: 50%; padding: 6px 14px; pointer-events: none; position: absolute;
    transform: translateX(-50%);
  }
  .rt-text-editor {
    background: #fff; border: 1.5px solid var(--rt-primary); border-radius: 2px; margin: 0;
    outline: none; overflow: hidden; padding: 1px; position: absolute; resize: none; z-index: 3;
  }

  .rt-inspector {
    background: var(--rt-panel); border-left: 1px solid var(--rt-border); display: flex;
    flex-direction: column; min-height: 0; overflow: hidden;
  }
  .rt-inspector-scroll { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; }
  .rt-inspector-target {
    align-items: center; border-bottom: 1px solid var(--rt-border); display: flex; gap: 8px;
    padding: 10px 12px;
  }
  .rt-inspector-target-name {
    flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .rt-inspector-section { border-bottom: 1px solid var(--rt-border); padding: 10px 12px; }
  .rt-inspector-section-head {
    align-items: baseline; display: flex; gap: 8px; justify-content: space-between; margin-bottom: 8px;
  }
  .rt-inspector-title { font-size: 11px; font-weight: 650; letter-spacing: 0.02em; margin: 0; text-transform: uppercase; color: var(--rt-muted); }
  .rt-inspector-hint { color: var(--rt-muted); font-size: 10px; text-align: right; }
  .rt-inspector-body { display: flex; flex-direction: column; gap: 8px; }
  .rt-inspector-row { display: flex; gap: 8px; }
  .rt-inspector-row > * { flex: 1; min-width: 0; }
  .rt-inspector-note { color: var(--rt-muted); font-size: 11px; line-height: 1.5; margin: 0; }
  .rt-inspector-error { color: var(--rt-danger); font-size: 11px; margin: 0; }

  .rt-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .rt-field-name { color: var(--rt-muted); font-size: 10px; }
  .rt-field-input { align-items: center; display: flex; gap: 4px; min-width: 0; }
  .rt-field-input input[type="text"], .rt-field-input input[type="number"], .rt-field-input select {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 7px;
    color: var(--rt-text); min-width: 0; padding: 5px 7px; width: 100%;
  }
  .rt-field-input input:focus, .rt-field-input select:focus {
    background: #fff; border-color: var(--rt-primary); outline: none;
  }
  .rt-field-input input:disabled { color: var(--rt-muted); }
  .rt-field-input--color input[type="color"] {
    background: none; border: 1px solid var(--rt-border); border-radius: 7px; height: 28px;
    padding: 1px; width: 36px;
  }
  .rt-field-suffix { color: var(--rt-muted); font-size: 10px; flex: none; }
  .rt-field-warning { color: var(--rt-warning); font-size: 10px; line-height: 1.4; }
  .rt-field--toggle { flex-direction: row; align-items: center; justify-content: space-between; }
  .rt-switch {
    background: var(--rt-border-strong); border: none; border-radius: 999px; cursor: pointer;
    height: 16px; padding: 2px; transition: background 120ms; width: 30px;
  }
  .rt-switch--on { background: var(--rt-primary); }
  .rt-switch-knob {
    background: #fff; border-radius: 999px; display: block; height: 12px; transition: transform 120ms;
    width: 12px;
  }
  .rt-switch--on .rt-switch-knob { transform: translateX(14px); }
  .rt-segmented {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 8px;
    display: inline-flex; overflow: hidden; padding: 2px;
  }
  .rt-segment {
    background: transparent; border: none; border-radius: 6px; color: var(--rt-muted);
    cursor: pointer; flex: 1; font-size: 11px; padding: 4px 8px; white-space: nowrap;
  }
  .rt-segment--on { background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12); color: var(--rt-primary); }
  .rt-chip {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 999px;
    color: var(--rt-muted); cursor: pointer; font-size: 10px; padding: 3px 8px;
  }
  .rt-chip--on { background: var(--rt-primary-soft); border-color: #c7d2fe; color: var(--rt-primary); }
  .rt-token-chip {
    background: var(--rt-primary-soft); border: 1px solid #c7d2fe; border-radius: 6px;
    color: var(--rt-primary); font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 11px; overflow: hidden; padding: 4px 8px; text-overflow: ellipsis; white-space: nowrap;
  }
  .rt-token-chip--muted {
    background: var(--rt-bg); border-color: var(--rt-border); color: var(--rt-muted); flex: 1; min-width: 0;
  }
  .rt-column-card {
    background: var(--rt-bg); border: 1px solid var(--rt-border); border-radius: 9px;
    display: flex; flex-direction: column; gap: 7px; padding: 8px;
  }
  .rt-column-card-foot { align-items: center; display: flex; gap: 6px; }
  .rt-align-grid { display: grid; gap: 6px; grid-template-columns: repeat(3, 1fr); }
  .rt-issue-list { display: flex; flex-direction: column; gap: 4px; list-style: none; margin: 0; padding: 10px 12px 0; }
  .rt-issue { border-radius: 7px; font-size: 11px; line-height: 1.45; padding: 6px 8px; }
  .rt-issue--error { background: #fef2f2; color: var(--rt-danger); }
  .rt-issue--warning { background: #fffbeb; color: var(--rt-warning); }

  .rt-statusbar {
    align-items: center; background: var(--rt-panel); border-top: 1px solid var(--rt-border);
    color: var(--rt-muted); display: flex; font-size: 11px; justify-content: space-between;
    padding: 7px 16px;
  }
  .rt-status-group { gap: 12px; }
  .rt-status-dot { background: #22c55e; border-radius: 999px; height: 7px; margin-right: 6px; width: 7px; }
  .rt-status-notice {
    background: #fffbeb; border: 1px solid #fcd34d; border-radius: 999px;
    color: var(--rt-warning); cursor: pointer; padding: 3px 12px;
  }
  .rt-status-notice:hover { border-color: var(--rt-warning); }
  .rt-status-error { color: var(--rt-danger); font-weight: 600; }
  .rt-status-warning { color: var(--rt-warning); font-weight: 600; }
`;
