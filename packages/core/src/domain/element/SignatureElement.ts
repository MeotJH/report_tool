import { Frame } from "../value/Frame.js";
import { Element, type ElementCommonChanges } from "./Element.js";
import type { ElementFollow } from "./ElementFollow.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/** 서명 자리의 설정 중 Inspector가 바꾸려는 값만 전달하게 한다. */
export interface SignatureChanges {
  readonly signer?: string;
  readonly required?: boolean;
  readonly label?: string | undefined;
}

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
    hidden = false,
    pageIndex = 0,
    repeated = false,
    follows: ElementFollow | null = null,
  ) {
    super(id, frame, z, locked, hidden, pageIndex, repeated, follows);
  }

  /** 방문자가 서명 영역 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitSignature(this);
  }

  /** 안내 문구 삭제도 유효한 변경이므로 전달한 키만 교체한다. */
  withSignature(changes: SignatureChanges): SignatureElement {
    return new SignatureElement(
      this.id,
      this.frame,
      this.z,
      this.locked,
      changes.signer ?? this.signer,
      changes.required ?? this.required,
      "label" in changes ? changes.label : this.label,
      this.hidden,
    );
  }

  /** 서명 설정을 보존하면서 공통 배치 상태만 바꾼다. */
  protected withCommon(changes: ElementCommonChanges): SignatureElement {
    const resolved = this.mergeCommon(changes);
    return new SignatureElement(
      this.id,
      resolved.frame,
      resolved.z,
      resolved.locked,
      this.signer,
      this.required,
      this.label,
      resolved.hidden,
      resolved.pageIndex,
      resolved.repeated,
      resolved.follows,
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
