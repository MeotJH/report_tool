import {
  Binding,
  FieldElement,
  type FormatSpec,
  Frame,
} from "@report-tool/core";
import type { DocumentFont } from "./DocumentFont.js";
import { DragCreateTool } from "./EditorTool.js";

/** 팔레트에서 선택한 데이터 경로를 가진 필드 요소를 드래그로 추가한다. */
export class FieldTool extends DragCreateTool {
  public readonly kind = "field" as const;

  /** 필드 선택 시점의 경로와 권장 포맷을 이후 캔버스 드래그에 사용한다. */
  constructor(
    private readonly chosenPath: string,
    private readonly chosenFormatSpec: FormatSpec | null,
  ) {
    super();
  }

  /** 문자열 직접 입력 없이 선택된 스키마 경로로 안전한 필드를 만든다. */
  protected createElement(frame: Frame, font: DocumentFont): FieldElement {
    const options = this.chosenFormatSpec === null
      ? {}
      : { formatSpec: this.chosenFormatSpec };
    return new FieldElement(
      this.createId(), frame, 0, false,
      new Binding(this.chosenPath, options),
      font.style(10),
    );
  }
}
