import type { TemplateVariable } from "@report-tool/core";
import { useMemo, useState } from "react";
import type { PaletteEntry } from "../controller/PaletteEntry.js";
import { FieldPaletteFilter } from "./FieldPaletteFilter.js";
import { VariableEditor } from "./VariableEditor.js";

/** 필드 목록의 입력과 선택 결과를 호스트 데이터 구조에 맞춰 제한한다. */
export interface FieldPaletteProps {
  readonly entries: readonly PaletteEntry[];
  readonly onPick: (entry: PaletteEntry) => void;
  readonly onDragStart?: (entry: PaletteEntry) => void;
  readonly onDragEnd?: () => void;
  readonly onAddMode?: () => void;
  readonly onAddVariable: (variable: TemplateVariable) => void;
  readonly onRemoveVariable: (name: string) => void;
  readonly mode?: "add" | "rebind";
}

/** 사용자가 문서에 필요한 데이터를 정의하고 문서에 놓게 한다. */
export function FieldPalette({
  entries,
  onPick,
  onDragStart,
  onDragEnd,
  onAddMode,
  onAddVariable,
  onRemoveVariable,
  mode = "add",
}: FieldPaletteProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
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
            : "배열을 놓으면 반복 표가, 단일 값을 놓으면 값 하나가 만들어집니다."}
        </p>
      </div>
      {mode === "rebind"
        ? <button className="rt-mode-switch" type="button" onClick={onAddMode}>＋ 새 필드 추가</button>
        : null}
      {adding
        ? <VariableEditor onAdd={onAddVariable} onClose={() => setAdding(false)} />
        : (
          <button
            className="rt-mode-switch"
            type="button"
            onClick={() => setAdding(true)}
          >
            ＋ 변수 추가
          </button>
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
              onPick={onPick}
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
  readonly onPick: (entry: PaletteEntry) => void;
  readonly onDragStart?: (entry: PaletteEntry) => void;
  readonly onDragEnd?: () => void;
  readonly onRemoveVariable: (name: string) => void;
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

/** 한 항목을 문서에 놓거나, 사용자가 정의한 것이면 지울 수 있게 한다. */
function EntryRow(props: EntryListProps & { entry: PaletteEntry }) {
  const { entry } = props;
  const isArray = entry.type === "array";
  const draggable = props.mode === "add";
  return (
    <div className={isArray ? "rt-entry-row rt-entry-row--array" : "rt-entry-row"}>
      <button
        className={isArray ? "rt-array-button" : "rt-field-button"}
        type="button"
        draggable={draggable}
        data-field-path={entry.path}
        onClick={() => props.onPick(entry)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", entry.path);
          props.onDragStart?.(entry);
        }}
        onDragEnd={() => props.onDragEnd?.()}
        aria-label={describeAction(entry, props.mode)}
        title={entry.path}
      >
        <span className="rt-field-copy">
          <span className="rt-field-label">
            {isArray ? "▾ " : ""}{entry.label}
            {entry.sensitive ? <span title="민감 필드">🔒</span> : null}
          </span>
          <span className="rt-field-path">{entry.path}</span>
        </span>
        <OriginBadge entry={entry} />
      </button>
      {entry.origin === "host" || entry.arrayPath !== null
        ? null
        : (
          <button
            type="button"
            className="rt-icon-button"
            title="이 변수 삭제"
            aria-label={`${entry.label} 변수 삭제`}
            onClick={() => props.onRemoveVariable(entry.path)}
          >
            ✕
          </button>
        )}
    </div>
  );
}

/** 값이 어디서 오는지를 한 배지로 구분해 신뢰도를 알 수 있게 한다. */
function OriginBadge(props: { entry: PaletteEntry }) {
  const labels: Readonly<Record<PaletteEntry["origin"], string>> = {
    host: props.entry.type === "array" ? "배열" : props.entry.type,
    declared: "선언",
  };
  const className = props.entry.origin === "host"
    ? "rt-type-badge"
    : `rt-type-badge rt-type-badge--${props.entry.origin}`;
  return <span className={className}>{labels[props.entry.origin]}</span>;
}

/** 보조 기술이 항목의 동작을 정확히 읽게 한다. */
function describeAction(entry: PaletteEntry, mode: "add" | "rebind"): string {
  if (entry.type === "array") return `${entry.label} 배열로 반복 표 만들기`;
  return `${entry.label} ${mode === "add" ? "추가" : "연결 변경"}`;
}
