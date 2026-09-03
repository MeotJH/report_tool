import type { TextAlign, TextOverflow, TextStyle, TextVerticalAlign } from "@report-tool/core";
import { ChoiceField, ColorField, InspectorRow, NumberField, SelectField, ToggleField } from "./InspectorFields.js";

/**
 * 가족 이름만으로는 읽기 어려운 글꼴에 사람이 부르는 이름을 붙인다.
 *
 * 목록 자체는 여기서 정하지 않는다. 무엇을 고를 수 있는지는 템플릿이 선언한
 * 글꼴이 정한다 — 그것이 호스트가 파일을 주기로 한 목록이기 때문이다.
 */
const FONT_LABELS: Readonly<Record<string, string>> = {
  MalgunGothic: "맑은 고딕",
  NotoSansKR: "Noto Sans KR",
};

/**
 * 고를 수 있는 글꼴을 템플릿 선언에서 만든다.
 *
 * 목록을 코드에 박아 두면 호스트가 파일을 주지 않는 글꼴을 편집기가 권하게 된다.
 * 그 글꼴을 고르면 화면은 시스템에 깔린 아무 글꼴로 재고, 발행본은 다른 파일을
 * 임베딩한다. 그 차이는 발행본에서만 드러난다.
 *
 * 지금 쓰고 있는 글꼴은 선언에 없더라도 목록에 남긴다. 목록에 없는 값을 고른
 * 상태로 두면 select가 첫 항목을 보여 주고, 사람이 건드리지 않은 글꼴이 조용히
 * 바뀐 것처럼 보인다.
 */
function toFontOptions(
  families: readonly string[],
  current: string,
): readonly Readonly<{ value: string; label: string }>[] {
  return [...new Set([...families, current])].map((family) => ({
    value: family,
    label: FONT_LABELS[family] ?? family,
  }));
}

/**
 * 텍스트·필드·표가 같은 글자 표현 편집 UI를 공유하게 한다.
 *
 * 요소마다 스타일 입력을 따로 두면 같은 속성이 화면마다 다르게 동작한다.
 */
export function TextStyleEditor(props: {
  style: TextStyle;
  onCommit: (style: TextStyle) => void;
  showOverflow?: boolean;
  /** 이 문서가 쓰기로 선언한 글꼴이다. 고를 수 있는 것은 이 목록뿐이다. */
  fontFamilies: readonly string[];
}) {
  const { style, onCommit } = props;
  return (
    <>
      <SelectField
        label="글꼴"
        value={style.font}
        options={toFontOptions(props.fontFamilies, style.font)}
        onCommit={(font) => onCommit(style.with({ font }))}
      />
      <InspectorRow>
        <NumberField
          label="크기"
          value={style.size}
          step={0.5}
          min={1}
          suffix="pt"
          onCommit={(size) => onCommit(style.with({ size }))}
        />
        <NumberField
          label="줄간격"
          value={style.lineHeight}
          step={0.05}
          min={0.8}
          onCommit={(lineHeight) => onCommit(style.with({ lineHeight }))}
        />
      </InspectorRow>
      <InspectorRow>
        <SelectField
          label="굵기"
          value={String(style.weight) as "400" | "500" | "700"}
          options={[
            { value: "400", label: "보통" },
            { value: "500", label: "중간" },
            { value: "700", label: "굵게" },
          ]}
          onCommit={(weight) => onCommit(style.with({
            weight: Number(weight) as 400 | 500 | 700,
          }))}
        />
        <ColorField
          label="색"
          value={style.color}
          onCommit={(color) => onCommit(style.with({ color: color ?? "#000000" }))}
        />
      </InspectorRow>
      <ChoiceField<TextAlign>
        label="가로 정렬"
        value={style.align}
        options={[
          { value: "left", label: "⌷⃖", title: "왼쪽" },
          { value: "center", label: "⌷", title: "가운데" },
          { value: "right", label: "⌷⃗", title: "오른쪽" },
        ]}
        onCommit={(align) => onCommit(style.with({ align }))}
      />
      <ChoiceField<TextVerticalAlign>
        label="세로 정렬"
        value={style.valign}
        options={[
          { value: "top", label: "위" },
          { value: "middle", label: "중간" },
          { value: "bottom", label: "아래" },
        ]}
        onCommit={(valign) => onCommit(style.with({ valign }))}
      />
      <ToggleField
        label="기울임"
        value={style.italic}
        onCommit={(italic) => onCommit(style.with({ italic }))}
      />
      {props.showOverflow === false
        ? null
        : (
          <SelectField<TextOverflow>
            label="넘칠 때"
            value={style.overflow}
            options={[
              { value: "wrap", label: "줄바꿈" },
              { value: "shrink", label: "글자 축소" },
              { value: "truncate", label: "잘라내기" },
            ]}
            onCommit={(overflow) => onCommit(style.with({ overflow }))}
          />
        )}
    </>
  );
}
