import { Frame } from "../value/Frame.js";
import { Element, type ElementCommonChanges } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/** 선의 표현 속성 중 바꾸려는 것만 Inspector가 전달하게 한다. */
export interface LineAppearanceChanges {
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly dash?: readonly number[] | undefined;
}

/**
 * 표와 문서 영역을 구분하는 선의 색상·굵기·점선 패턴을 표현한다.
 */
export class LineElement extends Element {
  public readonly dash: readonly number[] | undefined;
  public readonly type = "line";

  /** 선의 필수 표현과 선택적 점선 패턴을 외부 변경에서 보호해 보존한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    public readonly stroke: string,
    public readonly strokeWidth: number,
    dash?: readonly number[],
    hidden = false,
  ) {
    super(id, frame, z, locked, hidden);
    this.dash = dash === undefined ? undefined : [...dash];
  }

  /** 방문자가 선 도형 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitLine(this);
  }

  /** 점선 해제를 유효한 변경으로 다루기 위해 전달한 키만 교체한다. */
  withAppearance(changes: LineAppearanceChanges): LineElement {
    return new LineElement(
      this.id,
      this.frame,
      this.z,
      this.locked,
      changes.stroke ?? this.stroke,
      changes.strokeWidth ?? this.strokeWidth,
      "dash" in changes ? changes.dash : this.dash,
      this.hidden,
    );
  }

  /** 선의 표현과 점선 패턴을 보존하면서 공통 배치 상태만 바꾼다. */
  protected withCommon(changes: ElementCommonChanges): LineElement {
    const resolved = this.mergeCommon(changes);
    return new LineElement(
      this.id,
      resolved.frame,
      resolved.z,
      resolved.locked,
      this.stroke,
      this.strokeWidth,
      this.dash,
      resolved.hidden,
    );
  }

  /** 선 도형의 고유 속성을 렌더러와 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      dash: this.dash === undefined ? undefined : [...this.dash],
    };
  }
}
