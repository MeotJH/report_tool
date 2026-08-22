import { Frame, type Element } from "@report-tool/core";
import { FrameBounds } from "./FrameBounds.js";

/** 지원하는 정렬 기준을 툴바와 계산이 같은 값으로 공유하게 한다. */
export type AlignKind =
  | "left" | "horizontalCenter" | "right"
  | "top" | "verticalCenter" | "bottom";

/** 분배는 두 축 중 하나에서만 의미가 있으므로 축을 명시하게 한다. */
export type DistributeAxis = "horizontal" | "vertical";

/**
 * 여러 요소를 같은 기준선에 맞추거나 같은 간격으로 벌린 새 배치를 계산한다.
 *
 * 계산을 화면 코드에 두면 정렬 기준마다 조건문이 흩어지므로 배치 규칙만
 * 이 클래스에 모으고, 명령 기록은 호출하는 쪽이 맡는다.
 */
export class ElementAlignment {
  /**
   * 선택 요소를 기준 영역의 한 변이나 중심에 맞춘 새 배치를 만든다.
   *
   * 기준 영역을 인자로 받는 이유는, 하나만 선택했을 때는 페이지 배치 영역에,
   * 여럿을 선택했을 때는 선택 전체의 경계에 맞추는 것이 사용자의 기대와 같기 때문이다.
   */
  align(
    elements: readonly Element[],
    kind: AlignKind,
    reference: Frame,
  ): ReadonlyMap<string, Frame> {
    const changes = new Map<string, Frame>();
    for (const element of elements) {
      const moved = this.alignOne(element.frame, kind, reference);
      if (!element.frame.equals(moved)) changes.set(element.id, moved);
    }
    return changes;
  }

  /** 양 끝 요소는 그대로 두고 사이 요소의 간격을 같게 만든다. */
  distribute(
    elements: readonly Element[],
    axis: DistributeAxis,
  ): ReadonlyMap<string, Frame> {
    if (elements.length < 3) return new Map();
    const ordered = [...elements].sort(
      (first, second) => this.start(first.frame, axis) - this.start(second.frame, axis),
    );
    const gap = this.evenGap(ordered, axis);
    const changes = new Map<string, Frame>();
    let cursor = this.start(ordered[0]!.frame, axis) + this.size(ordered[0]!.frame, axis);
    for (const element of ordered.slice(1, -1)) {
      const moved = this.moveTo(element.frame, axis, cursor + gap);
      if (!element.frame.equals(moved)) changes.set(element.id, moved);
      cursor = cursor + gap + this.size(element.frame, axis);
    }
    return changes;
  }

  /** 선택 개수에 따라 달라지는 정렬 기준 영역을 한곳에서 결정한다. */
  referenceFrame(elements: readonly Element[], pageContent: Frame): Frame {
    if (elements.length <= 1) return pageContent;
    return FrameBounds.of(elements.map((element) => element.frame));
  }

  /** 정렬 기준별 목표 좌표 계산만 담당해 축 계산과 섞이지 않게 한다. */
  private alignOne(frame: Frame, kind: AlignKind, reference: Frame): Frame {
    const positions: Readonly<Record<AlignKind, () => Frame>> = {
      left: () => frame.moveTo(reference.x, frame.y),
      horizontalCenter: () => frame.moveTo(
        reference.x + (reference.width - frame.width) / 2, frame.y,
      ),
      right: () => frame.moveTo(
        reference.x + reference.width - frame.width, frame.y,
      ),
      top: () => frame.moveTo(frame.x, reference.y),
      verticalCenter: () => frame.moveTo(
        frame.x, reference.y + (reference.height - frame.height) / 2,
      ),
      bottom: () => frame.moveTo(
        frame.x, reference.y + reference.height - frame.height,
      ),
    };
    return positions[kind]();
  }

  /** 양 끝 사이의 빈 공간을 요소 수로 나눠 같은 간격을 구한다. */
  private evenGap(ordered: readonly Element[], axis: DistributeAxis): number {
    const first = ordered[0]!.frame;
    const last = ordered[ordered.length - 1]!.frame;
    const span = this.start(last, axis) - (this.start(first, axis) + this.size(first, axis));
    const occupied = ordered.slice(1, -1)
      .reduce((total, element) => total + this.size(element.frame, axis), 0);
    return (span - occupied) / (ordered.length - 1);
  }

  /** 축에 따라 달라지는 시작 좌표 읽기를 한곳에 모은다. */
  private start(frame: Frame, axis: DistributeAxis): number {
    return axis === "horizontal" ? frame.x : frame.y;
  }

  /** 축에 따라 달라지는 크기 읽기를 한곳에 모은다. */
  private size(frame: Frame, axis: DistributeAxis): number {
    return axis === "horizontal" ? frame.width : frame.height;
  }

  /** 축에 따라 달라지는 이동을 한곳에 모아 좌표 실수를 막는다. */
  private moveTo(frame: Frame, axis: DistributeAxis, position: number): Frame {
    return axis === "horizontal"
      ? frame.moveTo(position, frame.y)
      : frame.moveTo(frame.x, position);
  }
}
