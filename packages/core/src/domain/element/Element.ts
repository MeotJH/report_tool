import { Frame } from "../value/Frame.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/** 저장 형식과 Factory가 지원하는 문서 요소 종류를 제한한다. */
export type ElementType =
  | "text"
  | "field"
  | "table"
  | "image"
  | "box"
  | "line"
  | "signature";

/**
 * 모든 문서 요소의 위치·쌓임 순서·잠금 상태를 같은 방식으로 다루게 한다.
 */
export abstract class Element {
  public abstract readonly type: ElementType;

  /** 편집과 렌더링에 공통으로 필요한 요소 식별 정보와 배치 상태를 보존한다. */
  constructor(
    public readonly id: string,
    public readonly frame: Frame,
    public readonly z: number,
    public readonly locked: boolean,
  ) {}

  /** 렌더러가 요소 종류별 처리를 빠짐없이 구현하도록 방문자에게 제어를 넘긴다. */
  abstract accept<TResult>(visitor: ElementVisitor<TResult>): TResult;

  /** 불변 요소의 나머지 속성을 보존하면서 배치 영역만 교체하게 한다. */
  abstract withFrame(frame: Frame): Element;

  /** 요소별 속성을 캔버스 라이브러리와 무관한 저장 데이터로 변환한다. */
  abstract toJSON(): Record<string, unknown>;
}
