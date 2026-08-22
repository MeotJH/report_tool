import type { FieldSchema } from "@report-tool/core";
import { useMemo, useState } from "react";
import { FieldPaletteFilter } from "./FieldPaletteFilter.js";

type FieldSpec = FieldSchema[string];

/** 필드 목록의 입력과 선택 결과를 호스트 데이터 구조에 맞춰 제한한다. */
export interface FieldPaletteProps {
  readonly fields: FieldSchema;
  readonly onPick: (path: string, specification: FieldSpec) => void;
  readonly onDragStart?: (path: string, specification: FieldSpec) => void;
  readonly onDragEnd?: () => void;
  readonly onAddMode?: () => void;
  readonly mode?: "add" | "rebind";
  readonly placementActive?: boolean;
}

/** 사용자가 경로를 직접 입력하지 않고 승인된 데이터 필드만 선택하게 한다. */
export function FieldPalette({
  fields,
  onPick,
  onDragStart,
  onDragEnd,
  onAddMode,
  mode = "add",
  placementActive = false,
}: FieldPaletteProps) {
  const [query, setQuery] = useState("");
  const filter = useMemo(() => new FieldPaletteFilter(), []);
  const filteredFields = useMemo(() => filter.filter(fields, query), [fields, filter, query]);
  const fieldCount = filter.countFields(filteredFields);
  return (
    <section aria-label="데이터 필드" className="rt-field-palette">
      <div className="rt-palette-heading">
        <div className="rt-palette-title-row">
          <strong className="rt-palette-title">데이터 필드</strong>
          <span className="rt-field-count">{fieldCount}개</span>
        </div>
        <p className="rt-palette-help">
          {mode === "rebind"
            ? "연결을 바꿀 필드를 선택하세요."
            : "클릭하면 자동 추가됩니다. 원하는 위치에는 끌어 놓으세요."}
        </p>
      </div>
      {mode === "rebind"
        ? <button className="rt-mode-switch" type="button" onClick={onAddMode}>＋ 새 필드 추가</button>
        : null}
      {placementActive
        ? <div className="rt-placement-notice"><span>✦</span>흰 문서의 원하는 위치에 놓으세요</div>
        : null}
      <label className="rt-search">
        <span className="rt-search-icon" aria-hidden="true">⌕</span>
        <input
          className="rt-search-input"
          type="search"
          aria-label="데이터 필드 검색"
          placeholder="필드 이름 또는 경로 검색"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      {fieldCount === 0
        ? <div className="rt-empty">검색 결과가 없습니다.</div>
        : <FieldList
          fields={filteredFields}
          parentPath=""
          mode={mode}
          onPick={onPick}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />}
    </section>
  );
}

/** 배열 자식 필드를 경로와 깊이를 보존하며 재귀적으로 표시한다. */
function FieldList(props: Pick<FieldPaletteProps, "onPick" | "onDragStart" | "onDragEnd"> & {
  fields: FieldSchema;
  parentPath: string;
  mode: "add" | "rebind";
}) {
  return (
    <div className="rt-field-list">
      {Object.entries(props.fields).map(([key, specification]) => {
        const path = createPath(props.parentPath, key);
        if (specification.type === "array" && specification.children !== undefined) {
          return (
            <div className="rt-field-group" key={path}>
              <div className="rt-palette-title-row rt-field-group-title">
                <span>▾ {specification.label}</span>
                <span className="rt-type-badge">array</span>
              </div>
              <FieldList {...props} fields={specification.children} parentPath={path} />
            </div>
          );
        }
        return (
          <button
            className="rt-field-button"
            key={path}
            type="button"
            draggable={props.mode === "add"}
            data-field-path={path}
            onClick={() => props.onPick(path, specification)}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData("text/plain", path);
              props.onDragStart?.(path, specification);
            }}
            onDragEnd={() => props.onDragEnd?.()}
            aria-label={`${specification.label} 필드 ${props.mode === "add" ? "추가" : "연결 변경"}`}
            title={`${path} (${specification.type})`}
          >
            <span className="rt-field-copy">
              <span className="rt-field-label">
                {specification.label}
                {specification.sensitive === true ? <span title="민감 필드">🔒</span> : null}
              </span>
              <span className="rt-field-path">{path}</span>
            </span>
            <span className="rt-type-badge">{specification.type}</span>
            <span className="rt-field-action" aria-hidden="true">
              {props.mode === "add" ? "추가" : "연결"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 중첩 스키마 키를 Binding이 사용하는 점 표기 경로로 결합한다. */
function createPath(parentPath: string, key: string): string {
  if (parentPath === "" || key.includes(".")) return key;
  return `${parentPath}.${key}`;
}
