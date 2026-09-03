import { ElementFollow, type Element, type FollowMode } from "@report-tool/core";
import type { EditorActions } from "../controller/EditorActions.js";
import type { EditorController } from "../controller/EditorController.js";
import type { PaletteEntry } from "../controller/PaletteEntry.js";
import type { TemplateIssue } from "../controller/TemplateIssueFinder.js";
import { ElementInspectorVisitor } from "./inspector/ElementInspectorVisitor.js";
import type { ImageStore } from "./ImageStore.js";
import {
  ChoiceField,
  InspectorRow,
  InspectorSection,
  NumberField,
  SelectField,
  ToggleField,
} from "./inspector/InspectorFields.js";
import { PageInspector } from "./inspector/PageInspector.js";
import { LayerNamer } from "./LayerNamer.js";

/** Inspector가 현재 선택에 맞는 화면을 고르기 위해 필요한 최소 입력이다. */
export interface InspectorPanelProps {
  readonly controller: EditorController;
  readonly actions: EditorActions;
  readonly issues: readonly TemplateIssue[];
  /** 표를 어떤 데이터에 연결할 수 있는지 고르게 하려면 선언 목록이 필요하다. */
  readonly entries: readonly PaletteEntry[];

  /** 그림을 올리고 화면에 보여 주는 일은 저장소가 맡는다. */
  readonly images: ImageStore;
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
  const visitor = new ElementInspectorVisitor(actions, controller, props.entries, props.images);
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
      <InspectorSection
        title="쪽"
        hint={element.repeated ? "모든 쪽" : `${element.pageIndex + 1}쪽`}
      >
        <ToggleField
          label="모든 쪽에 반복"
          value={element.repeated}
          onCommit={(repeated) => actions.changeElement(element, element.withRepeated(repeated))}
        />
        <p className="rt-inspector-note">
          머리글·바닥글·쪽 번호처럼 쪽마다 같은 자리에 나와야 하는 것에 켭니다.
          표가 몇 쪽으로 흐를지는 발행할 데이터가 정하므로 쪽마다 따로 만들 수 없습니다.
        </p>
        {element.type === "text"
          ? (
            <p className="rt-inspector-note">
              문구에 <code>{"{{page}}"}</code>·<code>{"{{pages}}"}</code>를 적으면 쪽 번호가
              들어갑니다. <code>{"{{page:00}} / {{pages:00}}"}</code>는 <code>01 / 10</code>으로 나옵니다.
            </p>
          )
          : null}
        <FollowsTableField
          element={element}
          tables={followableTables(props.controller, element)}
          onCommit={(follows) => actions.changeElement(element, element.withFollows(follows))}
        />
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

/**
 * 이 요소가 어떤 표를 따라다닐지 고르게 한다.
 *
 * 표가 없는 쪽에서는 고를 것이 없으므로 아예 보여주지 않는다. 빈 선택 상자는
 * "여기서 뭔가 할 수 있는데 내가 못 찾는 건가"라는 질문만 남긴다.
 */
function FollowsTableField(props: {
  element: Element;
  tables: readonly Element[];
  onCommit: (follows: ElementFollow | null) => void;
}) {
  if (props.tables.length === 0) return null;
  const namer = new LayerNamer();
  const follows = props.element.follows;
  return (
    <>
      <SelectField
        label="이 표를 따라감"
        value={follows?.elementId ?? ""}
        options={[
          { value: "", label: "따라가지 않음" },
          ...props.tables.map((table) => ({ value: table.id, label: namer.name(table) })),
        ]}
        onCommit={(id) => props.onCommit(
          id === "" ? null : ElementFollow.of(id, follows?.mode ?? "caption"),
        )}
      />
      {follows === null ? null : (
        <>
          <ChoiceField<FollowMode>
            label="따라가는 방식"
            value={follows.mode}
            options={[
              { value: "caption", label: "표 위 제목" },
              { value: "flow", label: "표 아래 구역" },
            ]}
            onCommit={(mode) => props.onCommit(follows.withMode(mode))}
          />
          <p className="rt-inspector-note">
            <strong>표 위 제목</strong>은 표가 쪽을 넘을 때마다 이어지는 쪽에 같은 모양으로
            다시 나옵니다. 표 제목과 기간에 씁니다.
            <br />
            <strong>표 아래 구역</strong>은 표가 실제로 쓴 높이만큼 밀려 내려갑니다. 건수가
            달라져도 다음 표가 앞 표를 파고들지 않습니다.
          </p>
        </>
      )}
    </>
  );
}

/** 같은 쪽에 있는 표만 따라갈 대상으로 고를 수 있게 한다. */
function followableTables(
  controller: EditorController,
  element: Element,
): readonly Element[] {
  return controller.elementsOnActivePage().filter(
    (candidate) => candidate.type === "table" && candidate.id !== element.id,
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
