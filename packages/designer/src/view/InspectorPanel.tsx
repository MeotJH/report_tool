import type { Element } from "@report-tool/core";
import type { EditorActions } from "../controller/EditorActions.js";
import type { EditorController } from "../controller/EditorController.js";
import type { TemplateIssue } from "../controller/TemplateIssueFinder.js";
import { ElementInspectorVisitor } from "./inspector/ElementInspectorVisitor.js";
import { InspectorRow, InspectorSection, NumberField, ToggleField } from "./inspector/InspectorFields.js";
import { PageInspector } from "./inspector/PageInspector.js";
import { LayerNamer } from "./LayerNamer.js";

/** Inspector가 현재 선택에 맞는 화면을 고르기 위해 필요한 최소 입력이다. */
export interface InspectorPanelProps {
  readonly controller: EditorController;
  readonly actions: EditorActions;
  readonly issues: readonly TemplateIssue[];
}

/**
 * 선택 대상에 따라 즉시 바뀌는 속성 편집 영역을 제공한다.
 *
 * 선택이 없으면 페이지, 하나면 그 요소, 여럿이면 함께 바꿀 수 있는 것만 보여준다.
 * "지금 무엇을 바꾸는 중인가"가 화면에서 항상 분명해야 한다.
 */
export function InspectorPanel(props: InspectorPanelProps) {
  const selected = props.controller.getSelectedElements();
  return (
    <aside className="rt-inspector" aria-label="속성">
      <header className="rt-panel-head">
        <strong className="rt-panel-title">속성</strong>
        <span className="rt-panel-count">{describeSelection(selected)}</span>
      </header>
      <div className="rt-inspector-scroll">
        {selected.length === 0
          ? (
            <PageInspector
              page={props.controller.getTemplate().page}
              actions={props.actions}
              elementCount={props.controller.getTemplate().getElements().length}
            />
          )
          : null}
        {selected.length === 1 ? <SingleElementInspector {...props} element={selected[0]!} /> : null}
        {selected.length > 1 ? <MultiElementInspector {...props} elements={selected} /> : null}
      </div>
    </aside>
  );
}

/** 요소 하나의 공통 배치와 종류별 속성을 순서대로 보여준다. */
function SingleElementInspector(props: InspectorPanelProps & { element: Element }) {
  const { element, actions, controller } = props;
  const issues = props.issues.filter((issue) => issue.elementId === element.id);
  const visitor = new ElementInspectorVisitor(actions, controller);
  return (
    <>
      <div className="rt-inspector-target">
        <span className="rt-type-badge">{element.type}</span>
        <span className="rt-inspector-target-name">{new LayerNamer().name(element)}</span>
      </div>
      {issues.length === 0 ? null : (
        <ul className="rt-issue-list">
          {issues.map((issue) => (
            <li key={issue.message} className={`rt-issue rt-issue--${issue.severity}`}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      <InspectorSection title="배치">
        <InspectorRow>
          <NumberField
            label="X" value={element.frame.x} step={0.5} suffix="mm"
            disabled={element.locked}
            onCommit={(x) => actions.setFrame(element, element.frame.moveTo(x, element.frame.y))}
          />
          <NumberField
            label="Y" value={element.frame.y} step={0.5} suffix="mm"
            disabled={element.locked}
            onCommit={(y) => actions.setFrame(element, element.frame.moveTo(element.frame.x, y))}
          />
        </InspectorRow>
        <InspectorRow>
          <NumberField
            label="너비" value={element.frame.width} step={0.5} min={0} suffix="mm"
            disabled={element.locked}
            onCommit={(width) => actions.setFrame(
              element, element.frame.resizeTo(width, element.frame.height),
            )}
          />
          <NumberField
            label="높이" value={element.frame.height} step={0.5} min={0} suffix="mm"
            disabled={element.locked}
            onCommit={(height) => actions.setFrame(
              element, element.frame.resizeTo(element.frame.width, height),
            )}
          />
        </InspectorRow>
        <InspectorRow>
          <ToggleField label="잠금" value={element.locked} onCommit={() => actions.toggleLocked(element)} />
          <ToggleField label="숨김" value={element.hidden} onCommit={() => actions.toggleHidden(element)} />
        </InspectorRow>
        <OrderButtons actions={actions} />
      </InspectorSection>
      {visitor.build(element)}
    </>
  );
}

/** 여러 요소를 함께 다룰 때 의미가 있는 작업만 보여준다. */
function MultiElementInspector(props: InspectorPanelProps & { elements: readonly Element[] }) {
  const { actions, elements } = props;
  return (
    <>
      <div className="rt-inspector-target">
        <span className="rt-type-badge">{elements.length}개 선택</span>
      </div>
      <InspectorSection title="정렬" hint="선택 전체 범위를 기준으로 맞춥니다">
        <div className="rt-align-grid">
          <button type="button" className="rt-panel-button" onClick={() => actions.align("left")}>왼쪽</button>
          <button type="button" className="rt-panel-button" onClick={() => actions.align("horizontalCenter")}>가운데</button>
          <button type="button" className="rt-panel-button" onClick={() => actions.align("right")}>오른쪽</button>
          <button type="button" className="rt-panel-button" onClick={() => actions.align("top")}>위</button>
          <button type="button" className="rt-panel-button" onClick={() => actions.align("verticalCenter")}>중간</button>
          <button type="button" className="rt-panel-button" onClick={() => actions.align("bottom")}>아래</button>
        </div>
      </InspectorSection>
      <InspectorSection title="분배" hint="세 개 이상일 때 간격을 같게 만듭니다">
        <div className="rt-button-row">
          <button
            type="button" className="rt-panel-button" disabled={elements.length < 3}
            onClick={() => actions.distribute("horizontal")}
          >
            가로 균등
          </button>
          <button
            type="button" className="rt-panel-button" disabled={elements.length < 3}
            onClick={() => actions.distribute("vertical")}
          >
            세로 균등
          </button>
        </div>
      </InspectorSection>
      <InspectorSection title="순서">
        <OrderButtons actions={actions} />
      </InspectorSection>
    </>
  );
}

/** 단일·다중 선택이 같은 순서 변경 버튼을 공유하게 한다. */
function OrderButtons(props: { actions: EditorActions }) {
  return (
    <div className="rt-button-row">
      <button type="button" className="rt-panel-button" title="맨 앞으로 (])" onClick={() => props.actions.bringToFront()}>맨 앞</button>
      <button type="button" className="rt-panel-button" onClick={() => props.actions.bringForward()}>앞으로</button>
      <button type="button" className="rt-panel-button" onClick={() => props.actions.sendBackward()}>뒤로</button>
      <button type="button" className="rt-panel-button" title="맨 뒤로 ([)" onClick={() => props.actions.sendToBack()}>맨 뒤</button>
    </div>
  );
}

/** 현재 선택 상태를 패널 머리말에 짧게 표시한다. */
function describeSelection(selected: readonly Element[]): string {
  if (selected.length === 0) return "페이지";
  if (selected.length === 1) return "요소 1개";
  return `요소 ${selected.length}개`;
}
