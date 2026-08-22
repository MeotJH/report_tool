import type { Frame, PageSpec } from "@report-tool/core";

/** 스냅이 실제로 걸린 기준선을 화면에 그릴 수 있는 최소 정보로 표현한다. */
export interface SnapLine {
  readonly orientation: "vertical" | "horizontal";
  readonly positionMm: number;
}

/** 보정된 배치와 그 근거가 된 기준선을 함께 전달한다. */
export interface SnapResult {
  readonly frame: Frame;
  readonly lines: readonly SnapLine[];
}

/** 한 축에서 가장 가까운 기준선 후보를 찾은 결과다. */
interface AxisMatch {
  readonly delta: number;
  readonly positionMm: number | null;
}

/**
 * 손으로 배치한 요소를 주변 요소·페이지·여백의 기준선에 맞추고 그 근거를 함께 알려준다.
 *
 * 보정만 하고 근거를 숨기면 "왜 여기 붙었는지" 알 수 없어 사용자가 스냅을 신뢰하지
 * 못한다. 그래서 이동량과 함께 화면에 그릴 기준선을 반환한다.
 */
export class SnapGuide {
  /** 화면 배율과 무관한 mm 거리로 스냅 민감도를 고정한다. */
  constructor(private readonly thresholdMm = 1.5) {}

  /** 이동 중인 영역을 가로·세로 각각 한 기준선에만 붙인다. */
  snapMove(moving: Frame, targets: SnapTargets): SnapResult {
    const horizontal = this.closest(this.horizontalAnchors(moving), targets.vertical);
    const vertical = this.closest(this.verticalAnchors(moving), targets.horizontal);
    return {
      frame: moving.moveTo(moving.x + horizontal.delta, moving.y + vertical.delta),
      lines: this.toLines(horizontal, vertical),
    };
  }

  /**
   * 크기 변경 중인 영역의 움직이는 변만 기준선에 붙인다.
   *
   * 이동과 달리 중심과 반대쪽 변은 고정되어 있으므로 후보에 넣으면
   * 손이 잡고 있지 않은 변이 끌려가 크기가 튄다.
   */
  snapEdges(
    resized: Frame,
    movingEdges: MovingEdges,
    targets: SnapTargets,
  ): SnapResult {
    const horizontal = this.closest(this.edgeAnchors(
      resized.x, resized.x + resized.width, movingEdges.left, movingEdges.right,
    ), targets.vertical);
    const vertical = this.closest(this.edgeAnchors(
      resized.y, resized.y + resized.height, movingEdges.top, movingEdges.bottom,
    ), targets.horizontal);
    return {
      frame: this.applyEdgeDelta(resized, movingEdges, horizontal.delta, vertical.delta),
      lines: this.toLines(horizontal, vertical),
    };
  }

  /** 두 축의 후보가 있을 때만 화면에 그릴 기준선으로 바꾼다. */
  private toLines(horizontal: AxisMatch, vertical: AxisMatch): readonly SnapLine[] {
    const lines: SnapLine[] = [];
    if (horizontal.positionMm !== null) {
      lines.push({ orientation: "vertical", positionMm: horizontal.positionMm });
    }
    if (vertical.positionMm !== null) {
      lines.push({ orientation: "horizontal", positionMm: vertical.positionMm });
    }
    return lines;
  }

  /** 왼쪽·중앙·오른쪽 정렬을 같은 후보 계산으로 비교할 좌표를 만든다. */
  private horizontalAnchors(frame: Frame): readonly number[] {
    return [frame.x, frame.x + frame.width / 2, frame.x + frame.width];
  }

  /** 위·중앙·아래 정렬을 같은 후보 계산으로 비교할 좌표를 만든다. */
  private verticalAnchors(frame: Frame): readonly number[] {
    return [frame.y, frame.y + frame.height / 2, frame.y + frame.height];
  }

  /** 크기 변경에서 실제로 손이 잡고 있는 변만 스냅 후보로 남긴다. */
  private edgeAnchors(
    start: number,
    end: number,
    startMoves: boolean,
    endMoves: boolean,
  ): readonly number[] {
    const anchors: number[] = [];
    if (startMoves) anchors.push(start);
    if (endMoves) anchors.push(end);
    return anchors;
  }

  /** 스냅 이동량을 움직이는 변에만 반영해 고정된 변을 그대로 둔다. */
  private applyEdgeDelta(
    frame: Frame,
    edges: MovingEdges,
    deltaX: number,
    deltaY: number,
  ): Frame {
    const left = frame.x + (edges.left ? deltaX : 0);
    const top = frame.y + (edges.top ? deltaY : 0);
    const right = frame.x + frame.width + (edges.right ? deltaX : 0);
    const bottom = frame.y + frame.height + (edges.bottom ? deltaY : 0);
    return frame.moveTo(left, top).resizeTo(right - left, bottom - top);
  }

  /** 임계값 안의 모든 조합 중 이동량이 가장 작은 기준선 하나를 고른다. */
  private closest(
    movingAnchors: readonly number[],
    targets: readonly number[],
  ): AxisMatch {
    let delta = 0;
    let positionMm: number | null = null;
    let distance = this.thresholdMm + Number.EPSILON;
    for (const anchor of movingAnchors) {
      for (const target of targets) {
        const candidate = target - anchor;
        if (Math.abs(candidate) >= distance) continue;
        delta = candidate;
        positionMm = target;
        distance = Math.abs(candidate);
      }
    }
    return { delta, positionMm };
  }
}

/** 크기 변경에서 어느 변이 손에 잡혀 움직이는지 표현한다. */
export interface MovingEdges {
  readonly left: boolean;
  readonly top: boolean;
  readonly right: boolean;
  readonly bottom: boolean;
}

/**
 * 스냅이 참조할 세로선·가로선 후보를 한 값으로 모은다.
 *
 * 후보를 부르는 쪽에서 매번 조합하면 페이지 기준선을 빠뜨리기 쉬우므로
 * 생성 규칙을 이 클래스에만 둔다.
 */
export class SnapTargets {
  /** 세로선과 가로선 후보를 각각 중복 없이 보존한다. */
  private constructor(
    public readonly vertical: readonly number[],
    public readonly horizontal: readonly number[],
  ) {}

  /** 다른 요소·페이지 경계·여백·페이지 중심을 모두 기준선 후보로 만든다. */
  static from(others: readonly Frame[], page: PageSpec): SnapTargets {
    const content = page.contentFrame();
    const vertical = [
      0, page.widthMm(), page.widthMm() / 2,
      content.x, content.x + content.width,
      ...others.flatMap((frame) => [frame.x, frame.x + frame.width / 2, frame.x + frame.width]),
    ];
    const horizontal = [
      0, page.heightMm(), page.heightMm() / 2,
      content.y, content.y + content.height,
      ...others.flatMap((frame) => [frame.y, frame.y + frame.height / 2, frame.y + frame.height]),
    ];
    return new SnapTargets([...new Set(vertical)], [...new Set(horizontal)]);
  }
}
