import type { FormatSpec } from "@report-tool/core";
import { NumberField, SelectField, TextField, ToggleField } from "./InspectorFields.js";

/** 사용자가 고를 수 있는 표시 형식을 화면 용어로 제한한다. */
const KINDS: readonly Readonly<{ value: string; label: string }>[] = [
  { value: "", label: "그대로" },
  { value: "number", label: "숫자" },
  { value: "currency", label: "금액" },
  { value: "percent", label: "비율 → %" },
  { value: "date", label: "날짜" },
  { value: "mask", label: "가리기" },
];

/**
 * 값을 화면과 발행본에 **어떻게 찍을지**를 양식이 정하게 한다.
 *
 * 이 선택이 없으면 호스트는 이미 다 만들어진 문자열을 보내야 한다. 그러면 같은 값이
 * 숫자로 정렬되지 않고, 자릿수·단위가 문서마다 달라지고, 무엇보다 표시 규칙이 양식이
 * 아니라 호스트 코드에 흩어진다. 자릿수를 바꾸려고 개발자를 불러야 한다.
 *
 * 표의 열과 단일 필드가 같은 편집 화면을 쓴다. 같은 물음("이 값을 어떻게 찍는가")에
 * 두 화면이 다른 답을 주면, 담당자는 표 안과 밖에서 다른 규칙을 익혀야 한다.
 */
export function FormatSpecEditor(props: {
  spec: FormatSpec | null;
  onCommit: (spec: FormatSpec | null) => void;
}) {
  const spec = props.spec;
  return (
    <>
      <SelectField
        label="표시 형식"
        value={spec?.kind ?? ""}
        options={KINDS}
        onCommit={(kind) => props.onCommit(defaultSpecFor(kind))}
      />
      {detailsFor(spec, props.onCommit)}
    </>
  );
}

/**
 * 형식을 고르면 그 형식의 기본값으로 시작하게 한다.
 *
 * 빈 설정으로 두면 자릿수·통화가 없는 상태가 되어, 고른 직후 화면이 바뀌지 않는다.
 * 사람은 선택이 먹지 않았다고 읽는다.
 */
function defaultSpecFor(kind: string): FormatSpec | null {
  if (kind === "number") return { kind: "number", decimals: 0, thousands: true };
  if (kind === "currency") return { kind: "currency", currency: "KRW" };
  if (kind === "percent") return { kind: "percent", decimals: 1 };
  if (kind === "date") return { kind: "date", pattern: "YYYY-MM-DD" };
  if (kind === "mask") return { kind: "mask", keepHead: 6, keepTail: 0 };
  return null;
}

/** 고른 형식에만 있는 설정을 보여 준다. 형식마다 물어야 할 것이 다르다. */
function detailsFor(
  spec: FormatSpec | null,
  onCommit: (spec: FormatSpec | null) => void,
): React.ReactNode {
  if (spec === null || spec.kind === "text") return null;
  if (spec.kind === "number") {
    return (
      <>
        <NumberField
          label="소수 자릿수"
          value={spec.decimals ?? 0}
          min={0}
          max={6}
          onCommit={(decimals) => onCommit({ ...spec, decimals })}
        />
        <ToggleField
          label="천 단위 쉼표"
          value={spec.thousands ?? true}
          onCommit={(thousands) => onCommit({ ...spec, thousands })}
        />
        <TextField
          label="단위"
          value={spec.suffix ?? ""}
          placeholder="시간, %, 원"
          onCommit={(suffix) => onCommit({ ...spec, suffix: suffix === "" ? undefined : suffix })}
        />
        <p className="rt-inspector-note">
          이미 백분율인 값(<code>25.1</code>)에는 단위 <code>%</code>를 씁니다.
          비율(<code>0.251</code>)을 받는다면 <strong>비율 → %</strong>를 고르세요.
        </p>
      </>
    );
  }
  if (spec.kind === "percent") {
    return (
      <>
        <NumberField
          label="소수 자릿수"
          value={spec.decimals ?? 0}
          min={0}
          max={6}
          onCommit={(decimals) => onCommit({ ...spec, decimals })}
        />
        <p className="rt-inspector-note">
          받은 값에 <strong>100을 곱합니다</strong>. <code>0.251</code> → <code>25.1%</code>
        </p>
      </>
    );
  }
  if (spec.kind === "currency") {
    return (
      <>
        <SelectField
          label="통화"
          value={spec.currency}
          options={[{ value: "KRW", label: "원 (KRW)" }, { value: "USD", label: "달러 (USD)" }]}
          onCommit={(currency) => onCommit({ ...spec, currency: currency as "KRW" | "USD" })}
        />
        <ToggleField
          label="기호 표시"
          value={spec.showSymbol ?? true}
          onCommit={(showSymbol) => onCommit({ ...spec, showSymbol })}
        />
      </>
    );
  }
  if (spec.kind === "date") {
    return (
      <TextField
        label="날짜 형식"
        value={spec.pattern}
        placeholder="YYYY-MM-DD"
        onCommit={(pattern) => onCommit({ ...spec, pattern })}
      />
    );
  }
  return (
    <>
      <NumberField
        label="앞에서 남길 글자"
        value={spec.keepHead ?? 0}
        min={0}
        onCommit={(keepHead) => onCommit({ ...spec, keepHead })}
      />
      <NumberField
        label="뒤에서 남길 글자"
        value={spec.keepTail ?? 0}
        min={0}
        onCommit={(keepTail) => onCommit({ ...spec, keepTail })}
      />
    </>
  );
}
