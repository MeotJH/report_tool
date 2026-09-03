import type { TemplateSummary } from "@report-tool/core";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { EditorActions } from "../controller/EditorActions.js";
import type { EditorController } from "../controller/EditorController.js";
import type { TemplateFiling } from "../controller/TemplateFiling.js";

/**
 * 문서 이름·저장 상태·열기를 머리줄 한 자리에 모은다.
 *
 * 셋을 따로 두면 담당자는 "지금 것이 남아 있는가"를 화면 세 곳에서 짜맞춰야
 * 한다. 저장하지 않았다는 사실은 이름 바로 옆에 있어야 눈에 들어온다.
 */
export function TemplateFilingBar(props: {
  controller: EditorController;
  actions: EditorActions;
  filing: TemplateFiling;
}) {
  const label = useSyncExternalStore(
    (listener) => props.filing.subscribe(listener),
    () => props.filing.state().label(),
  );
  const state = props.filing.state();
  if (!props.filing.isAvailable()) {
    return <span className="rt-meta-pill">{props.controller.getTemplate().name}</span>;
  }
  return (
    <span className="rt-filing">
      <TemplateNameField controller={props.controller} actions={props.actions} />
      <button
        className="rt-filing-save"
        type="button"
        disabled={!state.canSave()}
        onClick={() => void props.filing.save()}
      >
        저장
      </button>
      <span
        className={state.needsAttention() ? "rt-filing-state rt-filing-state--warn" : "rt-filing-state"}
        role="status"
      >
        {label}
      </span>
      <OpenMenu filing={props.filing} />
    </span>
  );
}

/**
 * 문서 이름을 그 자리에서 고치게 한다.
 *
 * 치는 동안 문서를 바꾸지 않는다. 한 글자마다 이력을 남기면 실행 취소가 글자
 * 지우기가 되어, 방금 한 편집으로 돌아갈 수 없다. 확정은 포커스를 잃거나
 * Enter를 눌렀을 때다.
 */
function TemplateNameField(props: { controller: EditorController; actions: EditorActions }) {
  const name = props.controller.getTemplate().name;
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const commit = (): void => {
    props.actions.renameTemplate(draft);
    setDraft(props.controller.getTemplate().name);
  };
  return (
    <input
      className="rt-filing-name"
      aria-label="문서 이름"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        // Enter는 그 자리에서 확정하고 포커스는 남긴다. 이름은 한 번에 정하기보다
        // 몇 번 다듬는 것이라, 확정할 때마다 칸 밖으로 내보내면 다시 눌러야 한다.
        if (event.key === "Enter") commit();
        if (event.key === "Escape") setDraft(name);
      }}
    />
  );
}

/**
 * 보관소에 있는 문서를 골라 연다.
 *
 * 목록은 누를 때 읽는다. 편집기를 띄울 때마다 보관소를 두드리면, 저장을 한 번도
 * 하지 않는 사람에게도 그 비용을 물린다.
 *
 * 저장하지 않은 변경이 있으면 **먼저 그 사실을 보여 준다.** 확인 없이 열면 방금
 * 한 작업이 조용히 사라지고, 사라진 뒤에는 되돌릴 방법이 없다.
 */
function OpenMenu(props: { filing: TemplateFiling }) {
  const [documents, setDocuments] = useState<readonly TemplateSummary[] | null>(null);
  const dirty = props.filing.state().canSave();
  const close = (): void => setDocuments(null);
  const openList = (): void => {
    void props.filing.list().then(setDocuments);
  };
  return (
    <span className="rt-filing-open">
      <button className="rt-filing-button" type="button" onClick={openList}>
        열기
      </button>
      {documents === null ? null : (
        <div className="rt-filing-menu" role="menu">
          {dirty ? (
            <p className="rt-filing-warn">
              저장하지 않은 변경이 있습니다. 다른 문서를 열면 사라집니다.
            </p>
          ) : null}
          {documents.length === 0 ? (
            <p className="rt-filing-empty">저장된 문서가 없습니다.</p>
          ) : (
            documents.map((document) => (
              <button
                key={document.id}
                className="rt-filing-item"
                type="button"
                onClick={() => {
                  close();
                  void props.filing.open(document.id);
                }}
              >
                <span className="rt-filing-item-name">{document.name}</span>
                <span className="rt-filing-item-time">{document.updatedAt.slice(0, 10)}</span>
              </button>
            ))
          )}
          <button className="rt-filing-button" type="button" onClick={close}>
            닫기
          </button>
        </div>
      )}
    </span>
  );
}
