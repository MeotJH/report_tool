import { VariableInference, type TemplateVariable } from "@report-tool/core";
import { useMemo, useState } from "react";
import type { PaletteEntry } from "../controller/PaletteEntry.js";
import { FieldPaletteFilter } from "./FieldPaletteFilter.js";
import { VariableEditor } from "./VariableEditor.js";

/** 데이터 목록이 필요한 입력과 선택 결과를 한 묶음으로 제한한다. */
export interface FieldPaletteProps {
  readonly entries: readonly PaletteEntry[];
  readonly highlightedPath: string | null;
  readonly onHighlight: (path: string | null) => void;
  readonly onInsert: (entry: PaletteEntry) => void;
  readonly onDragStart?: (entry: PaletteEntry) => void;
  readonly onDragEnd?: () => void;
  readonly onAddMode?: () => void;
  readonly onAddVariables: (variables: readonly TemplateVariable[]) => void;
  /** 호스트가 미리보기에 쓰라고 준 샘플이다. 선언을 읽어 낼 유일한 근거다. */
  readonly sampleData: unknown;
  readonly onRemoveVariable: (path: string) => void;
  readonly mode?: "add" | "rebind";
}

/** 사용자가 문서에 필요한 데이터를 정의하고 문서에 놓게 한다. */
export function FieldPalette({
  entries,
  highlightedPath,
  onHighlight,
  onInsert,
  onDragStart,
  onDragEnd,
  onAddMode,
  onAddVariables,
  onRemoveVariable,
  sampleData,
  mode = "add",
}: FieldPaletteProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const filter = useMemo(() => new FieldPaletteFilter(), []);
  const filtered = useMemo(() => filter.filter(entries, query), [entries, filter, query]);
  return (
    <section aria-label="데이터 필드" className="rt-field-palette">
      <div className="rt-palette-heading">
        <div className="rt-palette-title-row">
          <strong className="rt-palette-title">데이터</strong>
          <span className="rt-field-count">{filter.countFields(filtered)}개</span>
        </div>
        <p className="rt-palette-help">
          {mode === "rebind"
            ? "연결을 바꿀 필드를 선택하세요."
            : "누르면 쓰는 곳이 표시됩니다. 문서에 넣을 때는 끌어 놓거나 ＋를 누르세요."}
        </p>
      </div>
      {mode === "rebind"
        ? <button className="rt-mode-switch" type="button" onClick={onAddMode}>＋ 새 필드 추가</button>
        : null}
      {adding === null
        ? (
          <>
            <button className="rt-mode-switch" type="button" onClick={() => setAdding("")}>
              ＋ 변수 추가
            </button>
            <InferFromSampleButton
              sampleData={sampleData}
              declared={entries.length}
              onAddVariables={onAddVariables}
            />
          </>
        )
        : (
          <VariableEditor
            parentPath={adding === "" ? undefined : adding}
            onAdd={onAddVariables}
            onClose={() => setAdding(null)}
          />
        )}
      <label className="rt-search">
        <span className="rt-search-icon" aria-hidden="true">⌕</span>
        <input
          className="rt-search-input"
          type="search"
          aria-label="데이터 필드 검색"
          placeholder="이름 또는 경로 검색"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      <div className="rt-palette-scroll">
        {filtered.length === 0
          ? <div className="rt-empty">검색 결과가 없습니다.</div>
          : (
            <EntryList
              entries={filtered}
              mode={mode}
              highlightedPath={highlightedPath}
              onHighlight={onHighlight}
              onInsert={onInsert}
              onAddChild={(parentPath) => setAdding(parentPath)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onRemoveVariable={onRemoveVariable}
            />
          )}
      </div>
    </section>
  );
}

/** 목록 한 줄이 필요한 입력을 모두 한 묶음으로 전달한다. */
interface EntryListProps {
  readonly entries: readonly PaletteEntry[];
  readonly mode: "add" | "rebind";
  readonly highlightedPath: string | null;
  readonly onHighlight: (path: string | null) => void;
  readonly onInsert: (entry: PaletteEntry) => void;
  readonly onAddChild: (parentPath: string) => void;
  readonly onDragStart?: (entry: PaletteEntry) => void;
  readonly onDragEnd?: () => void;
  readonly onRemoveVariable: (path: string) => void;
}

/** 배열과 자식 필드를 소속을 드러내며 재귀적으로 표시한다. */
function EntryList(props: EntryListProps) {
  return (
    <div className="rt-field-list">
      {props.entries.map((entry) => (
        entry.type === "array" && entry.children.length > 0
          ? (
            <div className="rt-field-group" key={entry.path}>
              <EntryRow {...props} entry={entry} />
              <EntryList {...props} entries={entry.children} />
            </div>
          )
          : <EntryRow {...props} key={entry.path} entry={entry} />
      ))}
    </div>
  );
}

/**
 * 한 항목의 확인과 편집을 서로 다른 버튼으로 분리한다.
 *
 * 행을 누르는 것만으로 문서에 요소가 생기면, 목록을 살펴보려던 사용자가 표를
 * 통째로 얻는다. 그래서 누르기는 "어디에 쓰이는지 보기"로 두고 삽입은 ＋로 옮겼다.
 */
function EntryRow(props: EntryListProps & { entry: PaletteEntry }) {
  const { entry } = props;
  const isArray = entry.type === "array";
  const selected = props.highlightedPath === entry.path;
  return (
    <div className={rowClassName(isArray, selected)}>
      <button
        className={isArray ? "rt-array-button" : "rt-field-button"}
        type="button"
        draggable={props.mode === "add"}
        data-field-path={entry.path}
        aria-pressed={selected}
        onClick={() => props.onHighlight(selected ? null : entry.path)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", entry.path);
          props.onDragStart?.(entry);
        }}
        onDragEnd={() => props.onDragEnd?.()}
        aria-label={`${entry.label} 쓰는 곳 보기`}
        title={entry.path}
      >
        <span className="rt-field-copy">
          <span className="rt-field-label">
            {isArray ? "▾ " : ""}{entry.label}
            {entry.sensitive
              ? (
                <span
                  className="rt-sensitive-mark"
                  title="민감한 값입니다. 문서에 넣으면 기본으로 가려집니다."
                  aria-label="민감한 값"
                >
                  🔒
                </span>
              )
              : null}
          </span>
          <span className="rt-field-path">{entry.path}</span>
        </span>
        <TypeBadge entry={entry} />
      </button>
      <button
        type="button"
        className="rt-icon-button"
        title={isArray ? "문서에 반복 표로 넣기" : "문서에 넣기"}
        aria-label={describeInsert(entry, props.mode)}
        onClick={() => props.onInsert(entry)}
      >
        ＋
      </button>
      {isArray
        ? (
          <button
            type="button"
            className="rt-icon-button"
            title="이 배열에 필드 추가"
            aria-label={`${entry.label}에 필드 추가`}
            onClick={() => props.onAddChild(entry.path)}
          >
            ⊕
          </button>
        )
        : null}
      <button
        type="button"
        className="rt-icon-button"
        title="이 선언 삭제"
        aria-label={`${entry.label} 선언 삭제`}
        onClick={() => props.onRemoveVariable(entry.path)}
      >
        ✕
      </button>
    </div>
  );
}

/** 강조된 행과 배열 행을 같은 규칙으로 구분해 보여준다. */
function rowClassName(isArray: boolean, selected: boolean): string {
  const names = ["rt-entry-row"];
  if (isArray) names.push("rt-entry-row--array");
  if (selected) names.push("rt-entry-row--on");
  return names.join(" ");
}

/** 값의 종류를 한 배지로 보여 어떤 자리에 쓸 수 있는지 알게 한다. */
function TypeBadge(props: { entry: PaletteEntry }) {
  return (
    <span className="rt-type-badge">
      {props.entry.type === "array" ? "배열" : props.entry.type}
    </span>
  );
}

/** 보조 기술이 삽입 버튼의 동작을 정확히 읽게 한다. */
function describeInsert(entry: PaletteEntry, mode: "add" | "rebind"): string {
  if (entry.type === "array") return `${entry.label} 배열로 반복 표 만들기`;
  return `${entry.label} ${mode === "add" ? "문서에 넣기" : "연결 변경"}`;
}

/**
 * 호스트가 준 샘플에서 선언을 한 번에 만들어 준다.
 *
 * 이미 선언이 있는 문서에서는 보여주지 않는다. 손으로 다듬어 둔 표시 이름을
 * 덮어쓸 위험이 있는 자리에 큰 버튼을 두면, 누르지 말아야 할 때 눌린다.
 * (겹치는 이름은 `addVariables`가 건너뛰지만, 버튼 자체를 감추는 편이 더 낫다.)
 */
function InferFromSampleButton(props: {
  sampleData: unknown;
  declared: number;
  onAddVariables: (variables: readonly TemplateVariable[]) => void;
}) {
  const inferred = useMemo(
    () => new VariableInference().infer(props.sampleData),
    [props.sampleData],
  );
  if (props.declared > 0 || inferred.length === 0) return null;
  return (
    <>
      <button
        className="rt-mode-switch"
        type="button"
        onClick={() => props.onAddVariables(inferred)}
      >
        ⇥ 샘플에서 {inferred.length}개 만들기
      </button>
      <p className="rt-palette-help">
        미리보기에 쓰는 샘플 데이터의 모양을 그대로 선언으로 옮깁니다. 표시 이름은
        경로 그대로 들어가므로 뒤에 고치세요.
      </p>
    </>
  );
}
