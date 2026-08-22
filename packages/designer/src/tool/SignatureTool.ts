import { SignatureElement, type Frame } from "@report-tool/core";
import { DragCreateTool } from "./EditorTool.js";

/**
 * 발행 후 서명 단계에서 채워질 자리를 드래그로 배치한다.
 *
 * 서명자 기본값을 수령인으로 두는 이유는 급여명세서·계약서에서 가장 흔한 대상이고,
 * 다른 서명자는 Inspector에서 바꾸면 되기 때문이다.
 */
export class SignatureTool extends DragCreateTool {
  public readonly kind = "signature" as const;

  /** 필수 서명이 기본값인 빈 서명 영역을 만든다. */
  protected createElement(frame: Frame): SignatureElement {
    return new SignatureElement(
      this.createId(), frame, 0, false, "employee", true, "서명",
    );
  }
}
