import {
  ConstantVariable,
  DataVariable,
  type TemplateVariable,
  type VariableValueType,
} from "@report-tool/core";
import { useState } from "react";

/** 사용자가 만들 수 있는 변수 종류를 화면 용어로 제한한다. */
type VariableKind = "constant" | "data" | "array";

/** 배열 변수의 자식 한 줄을 입력 중인 상태로 담는다. */
interface ChildDraft {
  readonly name: string;
  readonly label: string;
  readonly type: VariableValueType;
}

/** 값 종류 선택 목록을 한곳에서 관리한다. */
const VALUE_TYPES: readonly Readonly<{ value: VariableValueType; label: string }>[] = [
  { value: "string", label: "문자" },
  { value: "number", label: "숫자" },
  { value: "currency", label: "금액" },
  { value: "date", label: "날짜" },
  { value: "boolean", label: "참/거짓" },
  { value: "image", label: "이미지" },
];

/**
 * 사용자가 문서에 필요한 변수를 직접 정의하게 한다.
 *
 * 호스트가 제공하는 필드 목록은 "이 시스템이 줄 수 있는 값"이고, 계약서를 만드는
 * 사람이 아는 것은 "이 문서가 필요한 값"이다. 후자를 문서 자신이 말할 수 있어야
 * 담당자가 개발자를 기다리지 않고 양식을 완성할 수 있다.
 */
export function VariableEditor(props: {
  onAdd: (variable: TemplateVariable) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<VariableKind>("constant");
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState<VariableValueType>("string");
  const [required, setRequired] = useState(false);
  const [children, setChildren] = useState<readonly ChildDraft[]>([
    { name: "item", label: "항목", type: "string" },
    { name: "amount", label: "금액", type: "currency" },
  ]);
  const [error, setError] = useState<string | null>(null);

  /** 입력을 도메인 변수로 만들고, 도메인이 거부하면 원인을 그대로 보여준다. */
  const submit = (): void => {
    try {
      props.onAdd(createVariable({ kind, name, label, value, type, required, children }));
      props.onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "변수를 만들 수 없다");
    }
  };

  return (
    <div className="rt-variable-editor">
      <div className="rt-variable-kinds" role="group" aria-label="변수 종류">
        {([
          { value: "constant" as const, label: "정적 값" },
          { value: "data" as const, label: "데이터 필드" },
          { value: "array" as const, label: "배열" },
        ]).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={kind === option.value}
            className={kind === option.value ? "rt-segment rt-segment--on" : "rt-segment"}
            onClick={() => setKind(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="rt-variable-help">{describeKind(kind)}</p>

      <label className="rt-variable-field">
        <span className="rt-field-name">{kind === "constant" ? "이름" : "데이터 경로"}</span>
        <input
          type="text"
          value={name}
          placeholder={kind === "constant" ? "회사명" : "pay.bonus"}
          onChange={(event) => setName(event.currentTarget.value)}
        />
      </label>

      {kind === "constant"
        ? (
          <label className="rt-variable-field">
            <span className="rt-field-name">값</span>
            <input
              type="text"
              value={value}
              placeholder="모든 발행본에 같게 나갈 문구"
              onChange={(event) => setValue(event.currentTarget.value)}
            />
          </label>
        )
        : (
          <label className="rt-variable-field">
            <span className="rt-field-name">표시 이름</span>
            <input
              type="text"
              value={label}
              placeholder="상여금"
              onChange={(event) => setLabel(event.currentTarget.value)}
            />
          </label>
        )}

      {kind === "data"
        ? (
          <>
            <label className="rt-variable-field">
              <span className="rt-field-name">값 종류</span>
              <select
                value={type}
                onChange={(event) => setType(event.currentTarget.value as VariableValueType)}
              >
                {VALUE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="rt-variable-check">
              <input
                type="checkbox"
                checked={required}
                onChange={(event) => setRequired(event.currentTarget.checked)}
              />
              발행 시 반드시 채워져야 함
            </label>
          </>
        )
        : null}

      {kind === "array"
        ? (
          <ChildListEditor children={children} onChange={setChildren} />
        )
        : null}

      {error === null ? null : <p className="rt-inspector-error">{error}</p>}
      <div className="rt-button-row">
        <button type="button" className="rt-panel-button" onClick={props.onClose}>취소</button>
        <button type="button" className="rt-panel-button rt-panel-button--primary" onClick={submit}>
          추가
        </button>
      </div>
    </div>
  );
}

/** 배열이 반복할 한 줄의 구성을 사용자가 정하게 한다. */
function ChildListEditor(props: {
  children: readonly ChildDraft[];
  onChange: (children: readonly ChildDraft[]) => void;
}) {
  /** 한 자식의 한 속성만 바꿔 나머지 입력을 잃지 않게 한다. */
  const update = (index: number, changes: Partial<ChildDraft>): void => {
    props.onChange(props.children.map((child, childIndex) => (
      childIndex === index ? { ...child, ...changes } : child
    )));
  };

  return (
    <div className="rt-child-list">
      <span className="rt-field-name">반복되는 한 줄의 구성 (표의 열이 됩니다)</span>
      {props.children.map((child, index) => (
        <div className="rt-child-row" key={index}>
          <input
            type="text"
            value={child.label}
            placeholder="표시 이름"
            onChange={(event) => update(index, { label: event.currentTarget.value })}
          />
          <input
            type="text"
            value={child.name}
            placeholder="키"
            onChange={(event) => update(index, { name: event.currentTarget.value })}
          />
          <select
            value={child.type}
            onChange={(event) => update(index, {
              type: event.currentTarget.value as VariableValueType,
            })}
          >
            {VALUE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="rt-icon-button"
            title="이 줄 삭제"
            disabled={props.children.length === 1}
            onClick={() => props.onChange(
              props.children.filter((_child, childIndex) => childIndex !== index),
            )}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rt-panel-button"
        onClick={() => props.onChange([
          ...props.children,
          { name: `column${props.children.length + 1}`, label: "", type: "string" },
        ])}
      >
        ＋ 구성 추가
      </button>
    </div>
  );
}

/** 입력 상태를 도메인 변수로 바꾸는 규칙을 한곳에 모은다. */
function createVariable(draft: Readonly<{
  kind: VariableKind;
  name: string;
  label: string;
  value: string;
  type: VariableValueType;
  required: boolean;
  children: readonly ChildDraft[];
}>): TemplateVariable {
  const name = draft.name.trim();
  if (draft.kind === "constant") {
    return new ConstantVariable(name, draft.value);
  }
  const label = draft.label.trim() === "" ? name : draft.label.trim();
  if (draft.kind === "data") {
    return new DataVariable(name, label, draft.type, draft.required);
  }
  return new DataVariable(name, label, "array", draft.required, draft.children.map(
    (child) => new DataVariable(
      child.name.trim(),
      child.label.trim() === "" ? child.name.trim() : child.label.trim(),
      child.type,
    ),
  ));
}

/** 각 종류가 무엇을 만드는지 고르기 전에 알려준다. */
function describeKind(kind: VariableKind): string {
  const descriptions: Readonly<Record<VariableKind, string>> = {
    constant: "모든 발행본에 같은 값으로 나갑니다. 회사명·문의처처럼 문서가 소유한 문구입니다.",
    data: "발행 시 호스트가 채웁니다. 값 하나가 들어갈 자리를 만듭니다.",
    array: "발행 시 항목 수만큼 행이 반복됩니다. 문서에 놓으면 표가 됩니다.",
  };
  return descriptions[kind];
}
