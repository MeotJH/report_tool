import { Frame } from "../value/Frame.js";
import { Element } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/**
 * 표와 문서 영역을 구분하는 선의 색상·굵기·점선 패턴을 표현한다.
 */
export class LineElement extends Element {
  public readonly type = "line";
  public readonly dash: readonly number[] | undefined;

  /** 선의 필수 표현과 선택적 점선 패턴을 외부 변경에서 보호해 보존한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    public readonly stroke: string,
    public readonly strokeWidth: number,
    dash?: readonly number[],
  ) {
    super(id, frame, z, locked);
    this.dash = dash === undefined ? undefined : [...dash];
  }

  /** 방문자가 선 도형 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitLine(this);
  }

  /** 선의 표현과 점선 패턴을 보존하면서 배치 영역만 바꾼다. */
  withFrame(frame: Frame): LineElement {
    return new LineElement(
      this.id,
      frame,
      this.z,
      this.locked,
      this.stroke,
      this.strokeWidth,
      this.dash,
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
