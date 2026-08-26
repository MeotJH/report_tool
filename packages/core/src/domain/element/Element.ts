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
 * 요소 종류와 무관한 공통 편집 상태의 변경분만 전달한다.
 *
 * 편집기의 이동·크기변경·순서변경·잠금·숨김이 모두 이 한 가지 통로를 쓰기 때문에
 * 요소를 추가할 때 구현해야 하는 변경 메서드가 종류마다 늘어나지 않는다.
 */
export interface ElementCommonChanges {
  readonly frame?: Frame;
  readonly z?: number;
  readonly locked?: boolean;
  readonly hidden?: boolean;
  readonly pageIndex?: number;
  readonly repeated?: boolean;
}

/** 변경분과 현재 상태를 합친 뒤 하위 클래스 생성자에 넘길 완전한 공통 상태다. */
export interface ResolvedElementCommon {
  readonly frame: Frame;
  readonly z: number;
  readonly locked: boolean;
  readonly hidden: boolean;
  readonly pageIndex: number;
  readonly repeated: boolean;
}

/**
 * 모든 문서 요소의 위치·쌓임 순서·잠금·숨김 상태를 같은 방식으로 다루게 한다.
 *
 * 공통 상태를 바꾸는 메서드는 이 클래스에만 두고, 하위 클래스는 종류별 속성을
 * 보존하며 인스턴스를 다시 만드는 `withCommon` 하나만 구현한다.
 */
export abstract class Element {
  public abstract readonly type: ElementType;

  /** 편집과 렌더링에 공통으로 필요한 요소 식별 정보와 배치 상태를 보존한다. */
  constructor(
    public readonly id: string,
    public readonly frame: Frame,
    public readonly z: number,
    public readonly locked: boolean,
    public readonly hidden: boolean = false,
    public readonly pageIndex: number = 0,
    public readonly repeated: boolean = false,
  ) {}

  /** 렌더러가 요소 종류별 처리를 빠짐없이 구현하도록 방문자에게 제어를 넘긴다. */
  abstract accept<TResult>(visitor: ElementVisitor<TResult>): TResult;

  /** 요소별 속성을 캔버스 라이브러리와 무관한 저장 데이터로 변환한다. */
  abstract toJSON(): Record<string, unknown>;

  /** 불변 요소의 나머지 속성을 보존하면서 배치 영역만 교체한다. */
  withFrame(frame: Frame): Element {
    return this.withCommon({ frame });
  }

  /** 레이어 순서 변경이 요소의 다른 속성을 건드리지 않게 한다. */
  withZ(z: number): Element {
    return this.withCommon({ z });
  }

  /** 잠금 토글이 배치와 표현을 그대로 둔 새 요소를 만들게 한다. */
  withLocked(locked: boolean): Element {
    return this.withCommon({ locked });
  }

  /** 편집 중 임시로 가리는 상태를 다른 속성과 독립적으로 교체한다. */
  withHidden(hidden: boolean): Element {
    return this.withCommon({ hidden });
  }

  /**
   * 요소가 몇 번째 쪽에 놓이는지만 교체한다.
   *
   * 좌표는 쪽 안에서의 위치이므로 쪽을 옮겨도 그대로 둔다. 다른 쪽 같은 자리에
   * 놓이는 것이 사용자가 기대하는 결과다.
   */
  withPageIndex(pageIndex: number): Element {
    return this.withCommon({ pageIndex });
  }

  /**
   * 이 요소가 모든 쪽에 반복해서 나올지 정한다.
   *
   * 쪽 번호와 머리글은 쪽마다 따로 만들 수 없다. 표가 몇 쪽으로 흐를지는 발행할
   * 데이터가 정하므로, 만들 때는 몇 장이 될지 알 수 없기 때문이다.
   */
  withRepeated(repeated: boolean): Element {
    return this.withCommon({ repeated });
  }

  /** 하위 클래스가 종류별 속성을 보존하며 공통 상태만 교체하게 한다. */
  protected abstract withCommon(changes: ElementCommonChanges): Element;

  /** 모든 하위 클래스가 변경분과 현재 공통 상태를 같은 규칙으로 합치게 한다. */
  protected mergeCommon(changes: ElementCommonChanges): ResolvedElementCommon {
    return {
      frame: changes.frame ?? this.frame,
      z: changes.z ?? this.z,
      locked: changes.locked ?? this.locked,
      hidden: changes.hidden ?? this.hidden,
      pageIndex: changes.pageIndex ?? this.pageIndex,
      repeated: changes.repeated ?? this.repeated,
    };
  }
}
