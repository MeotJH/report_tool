import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { Element, type ElementCommonChanges } from "./Element.js";
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
    hidden = false,
    pageIndex = 0,
    repeated = false,
    followsElementId: string | null = null,
  ) {
    super(id, frame, z, locked, hidden, pageIndex, repeated, followsElementId);
  }

  /** 방문자가 데이터 필드 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitField(this);
  }

  /** 팔레트 재연결과 포맷 변경이 배치·스타일을 유지하게 한다. */
  withBinding(binding: Binding): FieldElement {
    return this.copy({ binding });
  }

  /** Inspector의 텍스트 표현 변경이 데이터 연결을 잃지 않게 한다. */
  withStyle(style: TextStyle): FieldElement {
    return this.copy({ style });
  }

  /** 데이터 연결과 스타일을 보존하면서 공통 배치 상태만 바꾼다. */
  protected withCommon(changes: ElementCommonChanges): FieldElement {
    return this.copy({}, changes);
  }

  /** 데이터 필드 고유 속성을 내부 클래스 구조와 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      binding: this.binding.toJSON(),
      style: this.style.toJSON(),
    };
  }

  /** 모든 변경 메서드가 같은 생성자 복사 규칙을 공유하게 한다. */
  private copy(
    changes: Readonly<{ binding?: Binding; style?: TextStyle }>,
    common: ElementCommonChanges = {},
  ): FieldElement {
    const resolved = this.mergeCommon(common);
    return new FieldElement(
      this.id,
      resolved.frame,
      resolved.z,
      resolved.locked,
      changes.binding ?? this.binding,
      changes.style ?? this.style,
      resolved.hidden,
      resolved.pageIndex,
      resolved.repeated,
      resolved.followsElementId,
    );
  }
}
