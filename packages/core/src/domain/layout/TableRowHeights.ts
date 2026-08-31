import type { CellRole } from "../element/TableCellRole.js";
import type { TableElement } from "../element/TableElement.js";
import { TextLayout, type TextWidthMeasurer } from "../text/TextLayout.js";
import type { TextStyle } from "../value/TextStyle.js";
import type { TableCellSpans } from "./TableCellSpans.js";

/** 글자 폭을 아는 곳(폰트)에서 스타일별 측정기를 받아 온다. */
export type StyleMeasurerFactory = (style: TextStyle) => TextWidthMeasurer;

/**
 * 표의 한 줄이 얼마나 높아야 하는지 정하는 방식을 다형적으로 고른다.
 *
 * 글자 폭을 아는 것은 폰트뿐이라 도메인이 직접 잴 수 없다. 잴 수 있는 곳에서는
 * 내용에 맞춰 늘리고, 재지 못하는 곳에서는 지정된 높이를 쓴다. 어느 쪽이든
 * 판단하는 코드는 여기 하나뿐이어야 캔버스와 발행본의 표가 같은 높이로 그려진다.
 */
export abstract class TableRowHeights {
  /** 글자를 잴 수 없는 곳에서 쓰는, 지정된 행 높이를 그대로 쓰는 방식이다. */
  static fixed(): TableRowHeights {
    return new FixedTableRowHeights();
  }

  /** 글자를 잴 수 있는 곳에서 쓰는, 내용에 맞춰 늘리는 방식이다. */
  static content(measurerFactory: StyleMeasurerFactory): TableRowHeights {
    return new ContentTableRowHeights(measurerFactory);
  }

  /** 이 줄을 그리는 데 필요한 높이를 mm로 정한다. */
  abstract heightFor(
    element: TableElement,
    cells: readonly string[],
    roles: readonly CellRole[],
    spans: TableCellSpans,
  ): number;

  /**
   * 칸마다 실제로 놓이는 줄을 준다. 글자를 잴 수 없으면 `null`이다.
   *
   * 줄을 알아야 행을 쪽 사이에서 자를 수 있다. 자르지 못하면 자리에 들어가지
   * 않는 행이 통째로 다음 쪽으로 밀려, 앞 쪽 아래가 통째로 빈다. 실제 리포트는
   * 한 건의 처리내용이 두 쪽에 걸친다.
   */
  abstract linesOf(
    element: TableElement,
    cells: readonly string[],
    roles: readonly CellRole[],
    spans: TableCellSpans,
  ): readonly (readonly string[])[] | null;

  /** 본문 한 줄이 차지하는 세로 길이(mm)다. */
  lineHeightMm(element: TableElement): number {
    return element.cellStyle.size * element.cellStyle.lineHeight / TableRowHeights.POINTS_PER_MM;
  }

  /** mm와 pt 사이의 환산을 한 곳에만 둔다. */
  private static readonly POINTS_PER_MM = 72 / 25.4;
}

/** 모든 줄이 표에 지정된 높이를 그대로 쓴다. */
class FixedTableRowHeights extends TableRowHeights {
  /** 내용과 무관하게 표가 정한 높이를 쓴다. */
  heightFor(
    element: TableElement,
    _cells: readonly string[],
    _roles: readonly CellRole[],
    _spans: TableCellSpans,
  ): number {
    return element.rowHeight;
  }

  /** 글자를 재지 못하므로 줄을 알 수 없고, 따라서 행을 자를 수도 없다. */
  linesOf(): null {
    return null;
  }
}

/**
 * 가장 긴 칸이 다 들어가도록 줄을 늘린다.
 *
 * 늘리기만 하고 줄이지는 않는다. 지정한 행 높이는 담당자가 보기 좋으라고 정한
 * 값이므로, 내용이 짧다고 마음대로 좁히면 표가 들쭉날쭉해진다. 반대로 내용이
 * 길면 반드시 늘려야 한다 — 늘리지 않으면 긴 문장이 아랫줄을 덮어 읽을 수 없다.
 */
class ContentTableRowHeights extends TableRowHeights {
  private readonly textLayout = new TextLayout();

  /** 글자 폭을 아는 쪽에서 측정기를 받아 둔다. */
  constructor(private readonly measurerFactory: StyleMeasurerFactory) {
    super();
  }

  /** 이 줄의 모든 칸 중 가장 높은 것에 맞추되 지정 높이 아래로는 내려가지 않는다. */
  heightFor(
    element: TableElement,
    cells: readonly string[],
    roles: readonly CellRole[],
    spans: TableCellSpans,
  ): number {
    // 병합된 칸은 덮은 열까지가 자기 폭이다. 자기 열 폭으로만 재면 두 칸에 걸친
    // 머리글이 실제보다 여러 줄로 계산되어 줄이 통째로 두꺼워진다.
    const needed = element.columns.map((_column, columnIndex) => this.cellHeight(
      cells[columnIndex] ?? "",
      this.styleOf(element, roles[columnIndex] ?? "body"),
      element.innerWidthMm(spans.widthMm(element.columns, columnIndex)),
    ));
    return Math.max(element.rowHeight, ...needed);
  }

  /** 칸마다 실제로 놓이는 줄을 그대로 준다. 높이 계산과 같은 배치를 쓴다. */
  linesOf(
    element: TableElement,
    cells: readonly string[],
    roles: readonly CellRole[],
    spans: TableCellSpans,
  ): readonly (readonly string[])[] {
    return element.columns.map((_column, columnIndex) => this.cellLines(
      cells[columnIndex] ?? "",
      this.styleOf(element, roles[columnIndex] ?? "body"),
      element.innerWidthMm(spans.widthMm(element.columns, columnIndex)),
    ));
  }

  /** 한 칸의 문구를 열 너비 안에서 실제 줄로 나눈다. */
  private cellLines(
    text: string,
    style: TextStyle,
    columnWidthMm: number,
  ): readonly string[] {
    if (text === "") return [];
    return this.textLayout.layout(
      text, style, columnWidthMm, this.measurerFactory(style),
    ).lines;
  }

  /** 한 칸의 문구가 열 너비 안에서 몇 줄이 되는지로 높이를 구한다. */
  private cellHeight(text: string, style: TextStyle, columnWidthMm: number): number {
    if (text === "") return 0;
    const layout = this.textLayout.layout(
      text, style, columnWidthMm, this.measurerFactory(style),
    );
    return this.textLayout.heightMm(layout, style);
  }

  /** 칸의 역할이 곧 글자 표현이므로 그리는 쪽과 같은 판단을 쓴다. */
  private styleOf(element: TableElement, role: CellRole): TextStyle {
    return role === "header" ? element.headerStyle : element.cellStyle;
  }
}
