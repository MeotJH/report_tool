import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { Element } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/**
 * 데이터와 연결된 자리를 일반 문구와 구분해 편집기와 검증기가 식별할 수 있게 한다.
 */
export class FieldElement extends Element {
  public readonly type = "field";

  /** 데이터 연결과 표현 스타일을 공통 배치 정보에 결합한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    public readonly binding: Binding,
    public readonly style: TextStyle,
  ) {
    super(id, frame, z, locked);
  }

  /** 방문자가 데이터 필드 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitField(this);
  }

  /** 데이터 연결과 스타일을 보존하면서 배치 영역만 바꾼다. */
  withFrame(frame: Frame): FieldElement {
    return new FieldElement(
      this.id,
      frame,
      this.z,
      this.locked,
      this.binding,
      this.style,
    );
  }

  /** 데이터 필드 고유 속성을 내부 클래스 구조와 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      binding: this.binding.toJSON(),
      style: this.style.toJSON(),
    };
  }
}
