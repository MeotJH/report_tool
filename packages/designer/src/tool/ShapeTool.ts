import { BoxElement, Frame, LineElement, type Element } from "@report-tool/core";
import { DragCreateTool, type ToolKind } from "./EditorTool.js";

/** 같은 드래그 동작을 상자 또는 선 생성 전략으로 전환한다. */
export class ShapeTool extends DragCreateTool {
  public readonly kind: ToolKind;

  /** 팔레트에서 고른 도형 종류를 한 번의 드래그 수명 동안 고정한다. */
  constructor(private readonly shape: "box" | "line") {
    super();
    this.kind = shape;
  }

  /** 선택한 종류에 맞는 최소 기본 표현의 도형 요소를 만든다. */
  protected createElement(frame: Frame): Element {
    if (this.shape === "box") {
      return new BoxElement(this.createId(), frame, 0, false, {
        stroke: "#334155", strokeWidth: 0.3,
      });
    }
    return new LineElement(this.createId(), frame, 0, false, "#334155", 0.3);
  }
}
