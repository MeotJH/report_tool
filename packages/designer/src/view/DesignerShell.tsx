import type { FieldSchema } from "@report-tool/core";
import { useSyncExternalStore } from "react";
import type { EditorActions } from "../controller/EditorActions.js";
import type { EditorController, EditorMode } from "../controller/EditorController.js";
import type { PaletteItem } from "../controller/PaletteDrag.js";
import { TemplateIssueFinder, type TemplateIssue } from "../controller/TemplateIssueFinder.js";
import type { ToolKind } from "../tool/EditorTool.js";
import { ImageTool } from "../tool/ImageTool.js";
import { SelectTool } from "../tool/SelectTool.js";
import { ShapeTool } from "../tool/ShapeTool.js";
import { SignatureTool } from "../tool/SignatureTool.js";
import { TableTool } from "../tool/TableTool.js";
import { TextTool } from "../tool/TextTool.js";
import { CanvasMetrics } from "./CanvasMetrics.js";
import { FieldPalette } from "./FieldPalette.js";
import { InspectorPanel } from "./InspectorPanel.js";
import { LayersPanel } from "./LayersPanel.js";
import { CanvasEditOverlay } from "./CanvasEditOverlay.js";

/** React 셸이 파사드 동작을 호출할 때 필요한 최소 경계를 정의한다. */
export interface DesignerShellProps {
  readonly controller: EditorController;
  readonly actions: EditorActions;
  readonly fields: FieldSchema;
  readonly onFieldPick: (item: PaletteItem) => void;
  readonly onFieldDragStart: (item: PaletteItem) => void;
  readonly onFieldDragEnd: () => void;
  readonly onFitToViewport: () => void;
}

/** 편집 도구·레이어·캔버스·속성을 Figma와 같은 세 칸 구조로 배치한다. */
export function DesignerShell(props: DesignerShellProps) {
  useSyncExternalStore(
    (listener) => props.controller.subscribe(listener),
    () => props.controller.getRevision(),
  );
  const template = props.controller.getTemplate();
  const issues = new TemplateIssueFinder().find(template);
  return (
    <div className="rt-designer">
      <DesignerHeader controller={props.controller} />
      <DesignerToolbar controller={props.controller} actions={props.actions} />
      <div className="rt-workspace">
        <aside className="rt-panel rt-panel--left">
          <LayersPanel controller={props.controller} actions={props.actions} issues={issues} />
          <FieldPalette
            fields={props.fields}
            mode={isFieldSelected(props.controller) ? "rebind" : "add"}
            placementActive={props.controller.getPaletteDropHint() !== null}
            onPick={props.onFieldPick}
            onDragStart={props.onFieldDragStart}
            onDragEnd={props.onFieldDragEnd}
            onAddMode={() => props.controller.selectElement(null)}
          />
        </aside>
        <CanvasWorkspace {...props} />
        <InspectorPanel controller={props.controller} actions={props.actions} issues={issues} />
      </div>
      <DesignerStatus controller={props.controller} issues={issues} />
    </div>
  );
}

/** 문서 정체성과 설계·미리보기 전환을 한 줄에 함께 둔다. */
function DesignerHeader(props: { controller: EditorController }) {
  const template = props.controller.getTemplate();
  const mode = props.controller.getMode();
  return (
    <header className="rt-header">
      <div className="rt-brand">
        <span className="rt-brand-mark">R</span>
        <span className="rt-brand-copy">
          <span className="rt-brand-title">Report Designer</span>
          <span className="rt-brand-subtitle">문서 템플릿 편집기</span>
        </span>
      </div>
      <div className="rt-document-meta">
        <span className="rt-meta-pill">{template.name}</span>
        <span className="rt-meta-pill">Draft · v{template.version}</span>
        <span className="rt-segmented" role="group" aria-label="표시 모드">
          {(["design", "preview"] as readonly EditorMode[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={mode === candidate}
              className={mode === candidate ? "rt-segment rt-segment--on" : "rt-segment"}
              onClick={() => props.controller.setMode(candidate)}
            >
              {candidate === "design" ? "설계" : "미리보기"}
            </button>
          ))}
        </span>
      </div>
    </header>
  );
}

/** 도구 전환과 편집 작업을 활성 상태가 보이는 한 줄 툴바로 제공한다. */
function DesignerToolbar(props: { controller: EditorController; actions: EditorActions }) {
  const { controller, actions } = props;
  const tool = controller.getCurrentToolKind();
  const selectionCount = controller.getSelectionModel().count();
  return (
    <nav className="rt-toolbar" aria-label="편집 도구">
      <div className="rt-toolbar-group">
        <ToolButton icon="⌖" label="선택" shortcut="V" active={tool === "select"} onClick={() => controller.setTool(new SelectTool())} />
        <ToolButton icon="T" label="텍스트" shortcut="T" active={tool === "text"} onClick={() => controller.setTool(new TextTool())} />
        <ToolButton icon="□" label="상자" shortcut="R" active={tool === "box"} onClick={() => controller.setTool(new ShapeTool("box"))} />
        <ToolButton icon="╱" label="선" shortcut="L" active={tool === "line"} onClick={() => controller.setTool(new ShapeTool("line"))} />
        <ToolButton icon="▦" label="표" shortcut="B" active={tool === "table"} onClick={() => controller.setTool(new TableTool())} />
        <ToolButton icon="▣" label="이미지" shortcut="M" active={tool === "image"} onClick={() => controller.setTool(new ImageTool())} />
        <ToolButton icon="✎" label="서명" shortcut="S" active={tool === "signature"} onClick={() => controller.setTool(new SignatureTool())} />
      </div>
      <div className="rt-toolbar-group">
        <ToolButton icon="↶" label="실행 취소" shortcut="⌘Z" disabled={!controller.canUndo()} onClick={() => controller.undo()} />
        <ToolButton icon="↷" label="다시 실행" shortcut="⌘⇧Z" disabled={!controller.canRedo()} onClick={() => controller.redo()} />
        <span className="rt-toolbar-divider" />
        <ToolButton icon="⧉" label="복제" shortcut="⌘D" disabled={selectionCount === 0} onClick={() => actions.duplicateSelection()} />
        <ToolButton icon="⌫" label="삭제" shortcut="Delete" danger disabled={selectionCount === 0} onClick={() => actions.deleteSelection()} />
      </div>
    </nav>
  );
}

/** 문서 규격·현재 작업 안내·확대율을 캔버스 바로 위에 함께 표시한다. */
function CanvasWorkspace(props: DesignerShellProps) {
  const { controller } = props;
  const page = controller.getTemplate().page;
  const zoom = controller.getViewport().getZoom();
  const metrics = new CanvasMetrics(zoom);
  const dropHint = controller.getPaletteDropHint();
  return (
    <section className="rt-canvas-panel" aria-label="문서 캔버스">
      <div className="rt-canvas-topbar">
        <span>{page.widthMm()} × {page.heightMm()} mm</span>
        <span className="rt-canvas-mode">{toolMessage(controller.getCurrentToolKind())}</span>
        <ZoomControls controller={controller} onFit={props.onFitToViewport} />
      </div>
      <div className="rt-canvas-viewport" data-designer-viewport>
        <div
          className="rt-canvas-page"
          style={{
            width: `${metrics.toPixels(page.widthMm())}px`,
            height: `${metrics.toPixels(page.heightMm())}px`,
          }}
        >
          <div data-designer-canvas />
          <CanvasEditOverlay controller={controller} actions={props.actions} />
        </div>
        {dropHint === null ? null : <div className="rt-drop-overlay">{dropHint}</div>}
      </div>
    </section>
  );
}

/** 확대·축소·화면 맞춤을 한곳에 모아 캔버스 탐색을 예측 가능하게 만든다. */
function ZoomControls(props: { controller: EditorController; onFit: () => void }) {
  const viewport = props.controller.getViewport();
  return (
    <span className="rt-zoom-controls">
      <button type="button" className="rt-icon-button" title="축소 (⌘−)" onClick={() => { viewport.zoomOut(); props.controller.notifyPreviewChange(); }}>−</button>
      <span className="rt-zoom-value">{viewport.getZoomPercent()}%</span>
      <button type="button" className="rt-icon-button" title="확대 (⌘+)" onClick={() => { viewport.zoomIn(); props.controller.notifyPreviewChange(); }}>＋</button>
      <button type="button" className="rt-panel-button" title="화면 맞춤 (⌘1)" onClick={props.onFit}>맞춤</button>
      <button type="button" className="rt-panel-button" title="실제 크기 (⌘0)" onClick={() => { viewport.resetZoom(); props.controller.notifyPreviewChange(); }}>100%</button>
    </span>
  );
}

/** 요소 수·선택 상태·확인이 필요한 항목을 가벼운 피드백으로 제공한다. */
function DesignerStatus(props: {
  controller: EditorController;
  issues: readonly TemplateIssue[];
}) {
  const errors = props.issues.filter((issue) => issue.severity === "error").length;
  const warnings = props.issues.length - errors;
  const notice = props.controller.getNotice();
  return (
    <footer className="rt-statusbar">
      <span className="rt-status-group">
        {notice === null
          ? (
            <>
              <span className="rt-status-dot" />
              Space+드래그로 화면 이동, ⌘+휠로 확대
            </>
          )
          : (
            <button
              type="button"
              className="rt-status-notice"
              title="확인하고 지우기"
              onClick={() => props.controller.clearNotice()}
            >
              {notice}
            </button>
          )}
      </span>
      <span className="rt-status-group">
        <span>요소 {props.controller.getTemplate().getElements().length}개</span>
        <span>선택 {props.controller.getSelectionModel().count()}개</span>
        {errors > 0 ? <span className="rt-status-error">오류 {errors}</span> : null}
        {warnings > 0 ? <span className="rt-status-warning">확인 {warnings}</span> : null}
      </span>
    </footer>
  );
}

/** 동일한 버튼 구조에서 활성·비활성·위험 상태를 일관되게 표현한다. */
function ToolButton(props: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
}) {
  const className = props.danger === true ? "rt-tool-button rt-tool-button--danger" : "rt-tool-button";
  return (
    <button
      type="button"
      className={className}
      aria-label={props.label}
      aria-pressed={props.active ?? false}
      title={props.shortcut === undefined ? props.label : `${props.label} (${props.shortcut})`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <span className="rt-tool-icon" aria-hidden="true">{props.icon}</span>
      <span className="rt-tool-label">{props.label}</span>
    </button>
  );
}

/** 현재 도구가 캔버스에서 기대하는 다음 행동을 짧게 안내한다. */
function toolMessage(kind: ToolKind): string {
  const messages: Record<ToolKind, string> = {
    select: "드래그로 이동, 핸들로 크기 변경, 빈 곳 드래그로 범위 선택",
    text: "드래그해서 텍스트 영역을 만드세요",
    field: "팔레트의 필드를 문서에 놓으세요",
    box: "드래그해서 상자를 만드세요",
    line: "드래그해서 선을 만드세요",
    table: "드래그해서 표 영역을 만드세요",
    image: "드래그해서 이미지 자리를 만드세요",
    signature: "드래그해서 서명 자리를 만드세요",
  };
  return messages[kind];
}

/** 현재 선택이 데이터 필드인지 타입 판별 값으로 안전하게 확인한다. */
function isFieldSelected(controller: EditorController): boolean {
  return controller.getSingleSelectedElement()?.type === "field";
}
