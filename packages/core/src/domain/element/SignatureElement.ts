import { Frame } from "../value/Frame.js";
import { Element } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/**
 * 발행 시 비어 있고 서명 단계에서 채워질 영역을 일반 이미지와 구분해 표현한다.
 */
export class SignatureElement extends Element {
  public readonly type = "signature";

  /** 서명자와 필수 여부를 배치 정보에 결합해 서명 절차가 해석할 수 있게 한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    public readonly signer: string,
    public readonly required: boolean = true,
    public readonly label?: string,
  ) {
    super(id, frame, z, locked);
  }

  /** 방문자가 서명 영역 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitSignature(this);
  }

  /** 서명 설정을 보존하면서 배치 영역만 바꾼다. */
  withFrame(frame: Frame): SignatureElement {
    return new SignatureElement(
      this.id,
      frame,
      this.z,
      this.locked,
      this.signer,
      this.required,
      this.label,
    );
  }

  /** 서명 영역의 고유 속성을 서명 구현과 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      signer: this.signer,
      required: this.required,
      label: this.label,
    };
  }
}
