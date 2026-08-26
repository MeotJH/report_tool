import type { Element } from "@report-tool/core";
import type { EditorActions } from "../controller/EditorActions.js";
import type { EditorController } from "../controller/EditorController.js";
import type { TemplateIssue } from "../controller/TemplateIssueFinder.js";
import { LayerNamer } from "./LayerNamer.js";

/** 요소 종류를 목록에서 한 글자로 구분할 수 있게 한다. */
const TYPE_ICONS: Readonly<Record<Element["type"], string>> = {
  text: "T",
  field: "◈",
  table: "▦",
  image: "▣",
  box: "□",
  line: "╱",
  signature: "✎",
};

/**
 * 지금 보고 있는 쪽의 요소를 쌓임 순서대로 보여주고 선택·잠금·숨김을 다루게 한다.
 *
 * 캔버스만으로는 겹친 요소나 숨긴 요소에 접근할 방법이 없다. 목록이 있어야
 * 잠긴 배경을 다시 풀 수 있고, 무엇이 무엇 위에 있는지 확인할 수 있다.
 *
 * 다른 쪽 요소까지 나열하면 목록에서 고른 것이 화면에 없다. 사용자는 선택이
 * 되지 않는다고 읽고, 그 상태에서 Delete를 누르면 보이지 않는 것이 지워진다.
 */
export function LayersPanel(props: {
  controller: EditorController;
  actions: EditorActions;
  issues: readonly TemplateIssue[];
}) {
  const namer = new LayerNamer();
  const elements = [...props.controller.elementsOnActivePage()]
    .sort((first, second) => second.z - first.z);
  const flagged = new Set(props.issues
    .map((issue) => issue.elementId)
    .filter((elementId): elementId is string => elementId !== null));

  return (
    <section className="rt-layers" aria-label="레이어">
      <header className="rt-panel-head">
        <strong className="rt-panel-title">레이어</strong>
        <span className="rt-panel-count">
          {props.controller.pageCount() > 1
            ? `${props.controller.getActivePageIndex() + 1}쪽 · ${elements.length}개`
            : `${elements.length}개`}
        </span>
      </header>
      {elements.length === 0
        ? <p className="rt-empty">이 쪽은 비어 있습니다. 위 도구로 요소를 만들어 보세요.</p>
        : (
          <ul className="rt-layer-list">
            {elements.map((element) => (
              <li key={element.id}>
                <div
                  className={rowClassName(props.controller, element)}
                  data-layer-row
                >
                  <button
                    type="button"
                    className="rt-layer-main"
                    title={`${element.type} · z ${element.z}`}
                    onClick={(event) => props.controller.selectElement(element.id, event.shiftKey)}
                  >
                    <span className="rt-layer-icon" aria-hidden="true">{TYPE_ICONS[element.type]}</span>
                    <span className="rt-layer-name">{namer.name(element)}</span>
                    {flagged.has(element.id)
                      ? <span className="rt-layer-flag" title="확인이 필요한 요소">!</span>
                      : null}
                  </button>
                  <button
                    type="button"
                    className={element.hidden ? "rt-icon-button rt-icon-button--on" : "rt-icon-button"}
                    aria-label={element.hidden ? "보이기" : "숨기기"}
                    title={element.hidden ? "보이기" : "숨기기"}
                    onClick={() => props.actions.toggleHidden(element)}
                  >
                    {element.hidden ? "◌" : "◉"}
                  </button>
                  <button
                    type="button"
                    className={element.locked ? "rt-icon-button rt-icon-button--on" : "rt-icon-button"}
                    aria-label={element.locked ? "잠금 해제" : "잠그기"}
                    title={element.locked ? "잠금 해제" : "잠그기"}
                    onClick={() => props.actions.toggleLocked(element)}
                  >
                    {element.locked ? "🔒" : "🔓"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

/** 선택·잠금·숨김 상태를 목록 한 줄의 표현으로 합친다. */
function rowClassName(controller: EditorController, element: Element): string {
  const classes = ["rt-layer-row"];
  if (controller.getSelectionModel().isSelected(element.id)) classes.push("rt-layer-row--selected");
  if (element.hidden) classes.push("rt-layer-row--hidden");
  if (element.locked) classes.push("rt-layer-row--locked");
  return classes.join(" ");
}
