import { Frame, TextElement } from "@report-tool/core";
import type { DocumentFont } from "./DocumentFont.js";
import { DragCreateTool } from "./EditorTool.js";

/** 드래그 영역에 기본 고정 문구 요소를 추가한다. */
export class TextTool extends DragCreateTool {
  public readonly kind = "text" as const;

  /** 사용자가 바로 편집할 수 있는 기본 문구와 스타일로 요소를 만든다. */
  protected createElement(frame: Frame, font: DocumentFont): TextElement {
    return new TextElement(
      this.createId(),
      frame,
      0,
      false,
      { kind: "literal", value: "텍스트" },
      font.style(10),
    );
  }
}
