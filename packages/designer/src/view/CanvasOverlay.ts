import Konva from "konva";
import type { Frame, PageSpec } from "@report-tool/core";
import type { SnapLine } from "../controller/SnapGuide.js";
import { ResizeHandleSet } from "../controller/ResizeHandleSet.js";

/** 보조 도형이 사용하는 색을 한곳에서 관리해 화면 언어를 일관되게 유지한다. */
const COLORS = {
  page: "#ffffff",
  pageShadow: "#0f172a",
  margin: "#c7d2fe",
  selection: "#4f46e5",
  handleFill: "#ffffff",
  hover: "#a5b4fc",
  guide: "#f43f5e",
  marquee: "#4f46e5",
  draft: "#f97316",
  warning: "#f59e0b",
  highlight: "#0ea5e9",
} as const;

/**
 * 문서 내용이 아닌 편집 보조 도형만 그린다.
 *
 * 페이지·여백·선택선·핸들·안내선·영역선택은 저장되지 않는 화면 언어이므로
 * 요소 렌더링과 섞지 않고 이 클래스에 모아 규칙을 한 번에 바꿀 수 있게 한다.
 */
export class CanvasOverlay {
  private readonly handles = new ResizeHandleSet();

  /** 모든 보조 도형이 같은 mm→px 변환을 사용하게 한다. */
  constructor(private readonly millimetersToPixels: number) {}

  /** 문서 영역과 바깥 화면을 구분하는 흰 페이지 배경을 만든다. */
  pageBackground(page: PageSpec): Konva.Rect {
    return new Konva.Rect({
      width: this.toPixels(page.widthMm()),
      height: this.toPixels(page.heightMm()),
      fill: COLORS.page,
      shadowColor: COLORS.pageShadow,
      shadowBlur: 18,
      shadowOpacity: 0.14,
      listening: false,
    });
  }

  /** 인쇄 여백을 항상 보여 요소가 잘릴 위험을 미리 알게 한다. */
  marginGuide(page: PageSpec): Konva.Rect {
    const content = page.contentFrame();
    return new Konva.Rect({
      x: this.toPixels(content.x),
      y: this.toPixels(content.y),
      width: this.toPixels(content.width),
      height: this.toPixels(content.height),
      stroke: COLORS.margin,
      strokeWidth: 1,
      dash: [3, 3],
      listening: false,
    });
  }

  /** 포인터가 지나가는 요소를 눌러 잡을 수 있는 대상으로 미리 알린다. */
  hoverOutline(frame: Frame): Konva.Rect {
    return this.outline(frame, COLORS.hover, 1);
  }

  /** 선택된 요소를 실선으로 감싸 현재 편집 대상을 분명히 한다. */
  selectionOutline(frame: Frame): Konva.Rect {
    return this.outline(frame, COLORS.selection, 1.5);
  }

  /** 여러 요소를 선택했을 때 전체 범위를 점선으로 함께 보여준다. */
  selectionBounds(frame: Frame): Konva.Rect {
    const rect = this.outline(frame, COLORS.selection, 1);
    rect.dash([5, 4]);
    rect.opacity(0.7);
    return rect;
  }

  /** 팔레트에서 고른 데이터를 쓰는 요소가 문서 어디에 있는지 보여준다. */
  highlightOutline(frame: Frame): Konva.Rect {
    const rect = this.outline(frame, COLORS.highlight, 2);
    rect.fill("rgba(14, 165, 233, 0.1)");
    return rect;
  }

  /** 문제가 있는 요소를 캔버스에서 바로 알아볼 수 있게 표시한다. */
  warningOutline(frame: Frame): Konva.Rect {
    const rect = this.outline(frame, COLORS.warning, 1.5);
    rect.dash([2, 2]);
    return rect;
  }

  /** 단일 선택에서만 여덟 방향 크기 변경 손잡이를 보여준다. */
  resizeHandles(frame: Frame): readonly Konva.Rect[] {
    const size = 7;
    return this.handles.views(frame).map((view) => new Konva.Rect({
      x: this.toPixels(view.xMm) - size / 2,
      y: this.toPixels(view.yMm) - size / 2,
      width: size,
      height: size,
      fill: COLORS.handleFill,
      stroke: COLORS.selection,
      strokeWidth: 1.2,
      listening: false,
    }));
  }

  /** 스냅이 걸린 근거를 페이지 전체를 지나는 선으로 보여준다. */
  snapLines(lines: readonly SnapLine[], page: PageSpec): readonly Konva.Line[] {
    return lines.map((line) => new Konva.Line({
      points: line.orientation === "vertical"
        ? [this.toPixels(line.positionMm), 0, this.toPixels(line.positionMm), this.toPixels(page.heightMm())]
        : [0, this.toPixels(line.positionMm), this.toPixels(page.widthMm()), this.toPixels(line.positionMm)],
      stroke: COLORS.guide,
      strokeWidth: 1,
      listening: false,
    }));
  }

  /** 빈 곳 드래그가 어떤 범위를 고르는 중인지 채워진 사각형으로 보여준다. */
  marquee(frame: Frame): Konva.Rect {
    const rect = this.outline(frame, COLORS.marquee, 1);
    rect.fill("rgba(79, 70, 229, 0.08)");
    rect.dash([4, 3]);
    return rect;
  }

  /** 새로 만들 요소의 크기를 확정 전에 점선으로 보여준다. */
  draft(frame: Frame): Konva.Rect {
    const rect = this.outline(frame, COLORS.draft, 1.5);
    rect.dash([6, 4]);
    return rect;
  }

  /** 모든 보조 사각형이 같은 좌표 변환과 입력 차단 규칙을 공유하게 한다. */
  private outline(frame: Frame, stroke: string, strokeWidth: number): Konva.Rect {
    return new Konva.Rect({
      x: this.toPixels(frame.x),
      y: this.toPixels(frame.y),
      width: this.toPixels(frame.width),
      height: this.toPixels(frame.height),
      stroke,
      strokeWidth,
      listening: false,
    });
  }

  /** 문서 단위 mm를 현재 배율의 화면 픽셀로 변환한다. */
  private toPixels(millimeters: number): number {
    return millimeters * this.millimetersToPixels;
  }
}
