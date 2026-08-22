import { Frame } from "../value/Frame.js";
import { Element } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/** 장식 상자의 선택적 표현 속성을 호출부에서 명확하게 전달하게 한다. */
export interface BoxElementOptions {
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly radius?: number;
}

/**
 * 표 구분과 강조 배경에 필요한 사각 도형을 데이터 바인딩 없이 표현한다.
 */
export class BoxElement extends Element {
  public readonly type = "box";
  public readonly fill: string | undefined;
  public readonly stroke: string | undefined;
  public readonly strokeWidth: number | undefined;
  public readonly radius: number | undefined;

  /** 사각 도형의 선택적 표현을 공통 배치 정보와 함께 보존한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    options: BoxElementOptions = {},
  ) {
    super(id, frame, z, locked);
    this.fill = options.fill;
    this.stroke = options.stroke;
    this.strokeWidth = options.strokeWidth;
    this.radius = options.radius;
  }

  /** 방문자가 사각 도형 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitBox(this);
  }

  /** 사각 도형 표현을 보존하면서 배치 영역만 바꾼다. */
  withFrame(frame: Frame): BoxElement {
    return new BoxElement(this.id, frame, this.z, this.locked, {
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      radius: this.radius,
    });
  }

  /** 사각 도형의 고유 속성을 렌더러와 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      radius: this.radius,
    };
  }
}
