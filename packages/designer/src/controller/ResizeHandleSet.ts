import type { Frame } from "@report-tool/core";
import type { MovingEdges } from "./SnapGuide.js";

/** 8방향 크기 변경 핸들의 위치를 안정적인 값으로 제한한다. */
export type ResizeHandlePosition =
  | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** 캔버스가 핸들을 그릴 위치와 마우스 커서 모양을 함께 전달한다. */
export interface ResizeHandleView {
  readonly position: ResizeHandlePosition;
  readonly xMm: number;
  readonly yMm: number;
  readonly cursor: string;
}

/**
 * 핸들 하나가 어느 변을 움직이는지와 그에 따른 새 영역 계산을 담당한다.
 *
 * 방향마다 if를 나열하면 8갈래가 되므로, 움직이는 변을 부호가 아닌 불리언으로
 * 표현해 계산식 하나로 모든 방향을 처리한다.
 */
export class ResizeHandle {
  /** 요소가 사라지지 않도록 크기 변경이 지킬 최소 mm를 고정한다. */
  private static readonly MIN_SIZE_MM = 2;

  /** 핸들의 이름과 움직이는 변을 함께 보존한다. */
  constructor(
    public readonly position: ResizeHandlePosition,
    public readonly edges: MovingEdges,
    public readonly cursor: string,
  ) {}

  /** 핸들을 그릴 좌표를 요소 영역에서 계산한다. */
  anchor(frame: Frame): Readonly<{ xMm: number; yMm: number }> {
    return {
      xMm: this.axisAnchor(frame.x, frame.width, this.edges.left, this.edges.right),
      yMm: this.axisAnchor(frame.y, frame.height, this.edges.top, this.edges.bottom),
    };
  }

  /** 포인터 이동량을 이 핸들이 움직이는 변에만 반영한 새 영역을 만든다. */
  resize(frame: Frame, deltaXMm: number, deltaYMm: number): Frame {
    const horizontal = this.resizeAxis(
      frame.x, frame.width, deltaXMm, this.edges.left, this.edges.right,
    );
    const vertical = this.resizeAxis(
      frame.y, frame.height, deltaYMm, this.edges.top, this.edges.bottom,
    );
    return frame
      .moveTo(horizontal.start, vertical.start)
      .resizeTo(horizontal.size, vertical.size);
  }

  /** 한 축에서 시작 좌표와 크기를 최소 크기 규칙과 함께 계산한다. */
  private resizeAxis(
    start: number,
    size: number,
    delta: number,
    startMoves: boolean,
    endMoves: boolean,
  ): Readonly<{ start: number; size: number }> {
    const nextStart = start + (startMoves ? delta : 0);
    const nextEnd = start + size + (endMoves ? delta : 0);
    if (nextEnd - nextStart >= ResizeHandle.MIN_SIZE_MM) {
      return { start: nextStart, size: nextEnd - nextStart };
    }
    if (startMoves) {
      return {
        start: nextEnd - ResizeHandle.MIN_SIZE_MM,
        size: ResizeHandle.MIN_SIZE_MM,
      };
    }
    return { start: nextStart, size: ResizeHandle.MIN_SIZE_MM };
  }

  /** 움직이는 변이 없는 축에서는 핸들이 중앙에 놓이게 한다. */
  private axisAnchor(
    start: number,
    size: number,
    startMoves: boolean,
    endMoves: boolean,
  ): number {
    if (startMoves) return start;
    if (endMoves) return start + size;
    return start + size / 2;
  }
}

/**
 * 여덟 개 핸들의 정의와 포인터 적중 판정을 한곳에 모은다.
 *
 * 판정 반경을 화면 픽셀이 아니라 mm로 받는 이유는 확대율이 달라져도
 * 손끝 감각이 같아야 하기 때문이다.
 */
export class ResizeHandleSet {
  private static readonly HANDLES: readonly ResizeHandle[] = [
    new ResizeHandle("nw", { left: true, top: true, right: false, bottom: false }, "nwse-resize"),
    new ResizeHandle("n", { left: false, top: true, right: false, bottom: false }, "ns-resize"),
    new ResizeHandle("ne", { left: false, top: true, right: true, bottom: false }, "nesw-resize"),
    new ResizeHandle("e", { left: false, top: false, right: true, bottom: false }, "ew-resize"),
    new ResizeHandle("se", { left: false, top: false, right: true, bottom: true }, "nwse-resize"),
    new ResizeHandle("s", { left: false, top: false, right: false, bottom: true }, "ns-resize"),
    new ResizeHandle("sw", { left: true, top: false, right: false, bottom: true }, "nesw-resize"),
    new ResizeHandle("w", { left: true, top: false, right: false, bottom: false }, "ew-resize"),
  ];

  /** 캔버스가 선택 영역에 그릴 핸들 목록을 좌표와 함께 제공한다. */
  views(frame: Frame): readonly ResizeHandleView[] {
    return ResizeHandleSet.HANDLES.map((handle) => {
      const anchor = handle.anchor(frame);
      return {
        position: handle.position,
        xMm: anchor.xMm,
        yMm: anchor.yMm,
        cursor: handle.cursor,
      };
    });
  }

  /** 포인터가 어떤 핸들을 잡았는지 판정해 드래그 의미를 결정하게 한다. */
  findAt(
    frame: Frame,
    xMm: number,
    yMm: number,
    toleranceMm: number,
  ): ResizeHandle | undefined {
    return ResizeHandleSet.HANDLES.find((handle) => {
      const anchor = handle.anchor(frame);
      return Math.abs(anchor.xMm - xMm) <= toleranceMm
        && Math.abs(anchor.yMm - yMm) <= toleranceMm;
    });
  }
}
