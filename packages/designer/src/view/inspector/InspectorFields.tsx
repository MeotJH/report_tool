import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NumberFieldDraft } from "./NumberFieldDraft.js";

/** Inspector 섹션이 제목과 내용을 같은 형태로 묶게 한다. */
export function InspectorSection(props: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rt-inspector-section">
      <header className="rt-inspector-section-head">
        <h3 className="rt-inspector-title">{props.title}</h3>
        {props.hint === undefined ? null : <span className="rt-inspector-hint">{props.hint}</span>}
      </header>
      <div className="rt-inspector-body">{props.children}</div>
    </section>
  );
}

/** 두 개 이상의 입력을 한 줄에 나란히 놓아 위치·크기를 함께 읽게 한다. */
export function InspectorRow(props: { children: ReactNode }) {
  return <div className="rt-inspector-row">{props.children}</div>;
}

/**
 * 숫자 입력을 확정 시점에만 반영한다.
 *
 * 타이핑 중 매 글자를 명령으로 만들면 Undo 이력이 글자 수만큼 쌓이므로
 * Enter와 포커스 이동에서만 확정하고, 값이 그대로면 아무 것도 기록하지 않는다.
 */
export function NumberField(props: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  const rule = useMemo(
    () => new NumberFieldDraft(props.min, props.max),
    [props.min, props.max],
  );
  const [draft, setDraft] = useState(() => rule.format(props.value));
  useEffect(() => setDraft(rule.format(props.value)), [props.value, rule]);

  /**
   * 확정할 값이 있을 때만 문서를 바꾼다.
   *
   * 칸에 들어갔다 나오기만 한 경우까지 저장하면, 화면에 보여 준 자리 수로 값이
   * 깎인다. 무엇이 확정 대상인지는 `NumberFieldDraft`가 판단한다.
   */
  const commit = (): void => {
    const resolved = rule.resolve(draft, props.value);
    if (resolved === null) {
      setDraft(rule.format(props.value));
      return;
    }
    setDraft(rule.format(resolved));
    props.onCommit(resolved);
  };

  return (
    <label className="rt-field">
      <span className="rt-field-name">{props.label}</span>
      <span className="rt-field-input">
        <input
          type="number"
          value={draft}
          step={props.step ?? 1}
          disabled={props.disabled}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setDraft(rule.format(props.value));
          }}
        />
        {props.suffix === undefined ? null : <span className="rt-field-suffix">{props.suffix}</span>}
      </span>
    </label>
  );
}

/** 문구 입력도 숫자와 같은 확정 규칙을 쓰게 한다. */
export function TextField(props: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  warning?: string;
}) {
  const [draft, setDraft] = useState(props.value);
  useEffect(() => setDraft(props.value), [props.value]);

  /** 값이 실제로 달라진 경우만 확정한다. */
  const commit = (): void => {
    if (draft === props.value) return;
    props.onCommit(draft);
  };

  return (
    <label className="rt-field rt-field--wide">
      <span className="rt-field-name">{props.label}</span>
      <span className="rt-field-input">
        <input
          type="text"
          value={draft}
          placeholder={props.placeholder}
          disabled={props.disabled}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setDraft(props.value);
          }}
        />
      </span>
      {props.warning === undefined
        ? null
        : <span className="rt-field-warning">{props.warning}</span>}
    </label>
  );
}

/** 선택 항목이 고정된 속성을 목록으로 바꿔 잘못된 값을 원천적으로 막는다. */
export function SelectField<TValue extends string>(props: {
  label: string;
  value: TValue;
  options: readonly Readonly<{ value: TValue; label: string }>[];
  onCommit: (value: TValue) => void;
  disabled?: boolean;
}) {
  return (
    <label className="rt-field">
      <span className="rt-field-name">{props.label}</span>
      <span className="rt-field-input">
        <select
          value={props.value}
          disabled={props.disabled}
          onChange={(event) => props.onCommit(event.currentTarget.value as TValue)}
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </span>
    </label>
  );
}

/** 색을 직접 입력하지 않고 고르게 하되 "없음"도 유효한 값으로 다룬다. */
export function ColorField(props: {
  label: string;
  value: string | undefined;
  onCommit: (value: string | undefined) => void;
  allowEmpty?: boolean;
}) {
  const current = props.value ?? "#000000";
  return (
    <label className="rt-field">
      <span className="rt-field-name">{props.label}</span>
      <span className="rt-field-input rt-field-input--color">
        <input
          type="color"
          value={current}
          onChange={(event) => props.onCommit(event.currentTarget.value)}
        />
        {props.allowEmpty === true
          ? (
            <button
              type="button"
              className={props.value === undefined ? "rt-chip rt-chip--on" : "rt-chip"}
              onClick={() => props.onCommit(props.value === undefined ? "#e2e8f0" : undefined)}
            >
              없음
            </button>
          )
          : null}
      </span>
    </label>
  );
}

/** 켜고 끄는 속성을 같은 모양의 스위치로 표현한다. */
export function ToggleField(props: {
  label: string;
  value: boolean;
  onCommit: (value: boolean) => void;
}) {
  return (
    <label className="rt-field rt-field--toggle">
      <span className="rt-field-name">{props.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={props.value}
        className={props.value ? "rt-switch rt-switch--on" : "rt-switch"}
        onClick={() => props.onCommit(!props.value)}
      >
        <span className="rt-switch-knob" />
      </button>
    </label>
  );
}

/** 정렬처럼 값이 셋뿐인 속성을 한 줄 버튼 묶음으로 고르게 한다. */
export function ChoiceField<TValue extends string>(props: {
  label: string;
  value: TValue;
  options: readonly Readonly<{ value: TValue; label: string; title?: string }>[];
  onCommit: (value: TValue) => void;
}) {
  return (
    <div className="rt-field">
      <span className="rt-field-name">{props.label}</span>
      <span className="rt-field-input rt-segmented">
        {props.options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title ?? option.label}
            aria-pressed={props.value === option.value}
            className={props.value === option.value ? "rt-segment rt-segment--on" : "rt-segment"}
            onClick={() => props.onCommit(option.value)}
          >
            {option.label}
          </button>
        ))}
      </span>
    </div>
  );
}
