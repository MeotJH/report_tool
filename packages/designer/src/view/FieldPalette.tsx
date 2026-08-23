import type { FieldSchema } from "@report-tool/core";
import { useMemo, useState } from "react";
import type { PaletteItem } from "../controller/PaletteDrag.js";
import { FieldPaletteFilter } from "./FieldPaletteFilter.js";

/** 필드 목록의 입력과 선택 결과를 호스트 데이터 구조에 맞춰 제한한다. */
export interface FieldPaletteProps {
  readonly fields: FieldSchema;
  readonly onPick: (item: PaletteItem) => void;
  readonly onDragStart?: (item: PaletteItem) => void;
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
            : "배열을 놓으면 반복 표가, 단일 필드를 놓으면 값 하나가 만들어집니다."}
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
          arrayPath={null}
          mode={mode}
          onPick={onPick}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />}
    </section>
  );
}

/** 목록 한 줄이 필요한 입력을 모두 한 묶음으로 전달한다. */
interface FieldListProps {
  readonly fields: FieldSchema;
  readonly parentPath: string;
  readonly arrayPath: string | null;
  readonly mode: "add" | "rebind";
  readonly onPick: (item: PaletteItem) => void;
  readonly onDragStart?: (item: PaletteItem) => void;
  readonly onDragEnd?: () => void;
}

/** 배열 자식 필드를 경로와 소속 배열을 보존하며 재귀적으로 표시한다. */
function FieldList(props: FieldListProps) {
  return (
    <div className="rt-field-list">
      {Object.entries(props.fields).map(([key, specification]) => {
        const path = createPath(props.parentPath, key);
        if (specification.type === "array" && specification.children !== undefined) {
          return (
            <div className="rt-field-group" key={path}>
              <ArrayRow {...props} path={path} specification={specification} />
              <FieldList
                {...props}
                fields={specification.children}
                parentPath={path}
                arrayPath={path}
              />
            </div>
          );
        }
        return (
          <FieldRow {...props} key={path} path={path} specification={specification} />
        );
      })}
    </div>
  );
}

/**
 * 배열 자체를 문서에 놓아 반복 표를 만들 수 있게 한다.
 *
 * 배열을 단순한 그룹 머리말로만 두면 사용자는 표를 만들 방법을 찾을 수 없다.
 * 자식 목록은 그대로 펼쳐 두어 열 하나만 다시 연결하는 것도 가능하게 한다.
 */
function ArrayRow(props: FieldListProps & {
  path: string;
  specification: FieldSchema[string];
}) {
  const item: PaletteItem = {
    path: props.path,
    specification: props.specification,
    arrayPath: null,
  };
  const draggable = props.mode === "add";
  return (
    <button
      className="rt-array-button"
      type="button"
      draggable={draggable}
      data-field-path={props.path}
      disabled={!draggable}
      onClick={() => props.onPick(item)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", props.path);
        props.onDragStart?.(item);
      }}
      onDragEnd={() => props.onDragEnd?.()}
      aria-label={`${props.specification.label} 배열로 반복 표 만들기`}
      title={`${props.path} — 문서에 놓으면 반복 표가 됩니다`}
    >
      <span className="rt-array-copy">
        <span className="rt-array-label">▾ {props.specification.label}</span>
        <span className="rt-field-path">{props.path}</span>
      </span>
      <span className="rt-type-badge">배열</span>
      {draggable ? <span className="rt-field-action" aria-hidden="true">표</span> : null}
    </button>
  );
}

/** 단일 필드를 문서에 놓거나 선택된 필드의 연결을 바꾼다. */
function FieldRow(props: FieldListProps & {
  path: string;
  specification: FieldSchema[string];
}) {
  const item: PaletteItem = {
    path: props.path,
    specification: props.specification,
    arrayPath: props.arrayPath,
  };
  return (
    <button
      className="rt-field-button"
      type="button"
      draggable={props.mode === "add"}
      data-field-path={props.path}
      onClick={() => props.onPick(item)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", props.path);
        props.onDragStart?.(item);
      }}
      onDragEnd={() => props.onDragEnd?.()}
      aria-label={`${props.specification.label} 필드 ${props.mode === "add" ? "추가" : "연결 변경"}`}
      title={`${props.path} (${props.specification.type})`}
    >
      <span className="rt-field-copy">
        <span className="rt-field-label">
          {props.specification.label}
          {props.specification.sensitive === true ? <span title="민감 필드">🔒</span> : null}
        </span>
        <span className="rt-field-path">{props.path}</span>
      </span>
      <span className="rt-type-badge">{props.specification.type}</span>
      <span className="rt-field-action" aria-hidden="true">
        {props.mode === "add" ? "추가" : "연결"}
      </span>
    </button>
  );
}

/** 중첩 스키마 키를 Binding이 사용하는 점 표기 경로로 결합한다. */
function createPath(parentPath: string, key: string): string {
  if (parentPath === "" || key.includes(".")) return key;
  return `${parentPath}.${key}`;
}
