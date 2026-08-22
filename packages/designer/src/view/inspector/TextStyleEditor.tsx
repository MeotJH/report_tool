import type { TextAlign, TextOverflow, TextStyle, TextVerticalAlign } from "@report-tool/core";
import { ChoiceField, ColorField, InspectorRow, NumberField, SelectField, ToggleField } from "./InspectorFields.js";

/** 편집기가 제안하는 글꼴 목록을 한곳에서 관리한다. */
const FONTS: readonly Readonly<{ value: string; label: string }>[] = [
  { value: "Pretendard", label: "Pretendard" },
  { value: "NotoSansKR", label: "Noto Sans KR" },
  { value: "Helvetica", label: "Helvetica" },
];

/**
 * 텍스트·필드·표가 같은 글자 표현 편집 UI를 공유하게 한다.
 *
 * 요소마다 스타일 입력을 따로 두면 같은 속성이 화면마다 다르게 동작한다.
 */
export function TextStyleEditor(props: {
  style: TextStyle;
  onCommit: (style: TextStyle) => void;
  showOverflow?: boolean;
}) {
  const { style, onCommit } = props;
  return (
    <>
      <SelectField
        label="글꼴"
        value={style.font}
        options={FONTS}
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
