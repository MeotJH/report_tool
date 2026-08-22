import { ImageElement, type Frame } from "@report-tool/core";
import { DragCreateTool } from "./EditorTool.js";

/**
 * 로고·직인이 들어갈 이미지 자리를 드래그로 배치한다.
 *
 * 자산 식별자를 비운 상태로 만드는 이유는, 라이브러리가 파일을 직접 읽지 않고
 * 호스트의 ImageProvider가 해석할 식별자만 템플릿에 담기 때문이다.
 * 비어 있는 동안은 Inspector와 Layers가 "출처 미지정" 경고를 표시한다.
 */
export class ImageTool extends DragCreateTool {
  public readonly kind = "image" as const;

  /** 출처를 나중에 지정할 수 있는 빈 이미지 자리를 만든다. */
  protected createElement(frame: Frame): ImageElement {
    return new ImageElement(this.createId(), frame, 0, false, {
      assetId: "",
      fit: "contain",
    });
  }
}
