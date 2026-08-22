import {
  PageSpec,
  type PageMargin,
  type PageOrientation,
  type PageSize,
} from "@report-tool/core";
import { useState } from "react";
import type { EditorActions } from "../../controller/EditorActions.js";
import { ChoiceField, InspectorRow, InspectorSection, NumberField, SelectField } from "./InspectorFields.js";

/**
 * 아무 것도 선택하지 않았을 때 문서 자체의 설정을 편집하게 한다.
 *
 * 선택이 없을 때 빈 화면을 보여주면 사용자가 다음에 할 일을 찾지 못한다.
 * Figma가 같은 자리에 페이지 속성을 두는 이유와 같다.
 */
export function PageInspector(props: {
  page: PageSpec;
  actions: EditorActions;
  elementCount: number;
}) {
  const { page, actions } = props;
  const margin = page.marginMm();
  const [error, setError] = useState<string | null>(null);

  /** 여백 한 방향만 바꾸고 유효하지 않으면 원인을 표시한다. */
  const commitMargin = (index: number, value: number): void => {
    const next = [...margin] as [number, number, number, number];
    next[index] = value;
    try {
      actions.changePage(page.withMargin(next as PageMargin));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "여백을 바꿀 수 없다");
    }
  };

  return (
    <>
      <InspectorSection title="용지" hint={`${page.widthMm()} × ${page.heightMm()} mm`}>
        <SelectField<PageSize>
          label="규격"
          value={page.sizeName()}
          options={[
            { value: "A4", label: "A4" },
            { value: "A5", label: "A5" },
            { value: "LETTER", label: "Letter" },
          ]}
          onCommit={(size) => actions.changePage(page.withSize(size))}
        />
        <ChoiceField<PageOrientation>
          label="방향"
          value={page.orientationName()}
          options={[
            { value: "portrait", label: "세로" },
            { value: "landscape", label: "가로" },
          ]}
          onCommit={(orientation) => actions.changePage(page.withOrientation(orientation))}
        />
      </InspectorSection>
      <InspectorSection title="여백" hint="점선 안쪽이 배치 영역입니다">
        <InspectorRow>
          <NumberField label="위" value={margin[0]} min={0} suffix="mm" onCommit={(value) => commitMargin(0, value)} />
          <NumberField label="오른쪽" value={margin[1]} min={0} suffix="mm" onCommit={(value) => commitMargin(1, value)} />
        </InspectorRow>
        <InspectorRow>
          <NumberField label="아래" value={margin[2]} min={0} suffix="mm" onCommit={(value) => commitMargin(2, value)} />
          <NumberField label="왼쪽" value={margin[3]} min={0} suffix="mm" onCommit={(value) => commitMargin(3, value)} />
        </InspectorRow>
        {error === null ? null : <p className="rt-inspector-error">{error}</p>}
      </InspectorSection>
      <InspectorSection title="문서">
        <p className="rt-inspector-note">
          요소 {props.elementCount}개. 요소를 선택하면 이 자리에 속성이 나타납니다.
        </p>
      </InspectorSection>
    </>
  );
}
