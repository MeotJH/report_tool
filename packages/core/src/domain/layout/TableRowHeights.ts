import { TableCellRole } from "../element/TableCellRole.js";
import type { TableElement } from "../element/TableElement.js";
import { TextLayout, type TextWidthMeasurer } from "../text/TextLayout.js";
import type { TextStyle } from "../value/TextStyle.js";

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
    rowOffset: number,
  ): number;
}

/** 모든 줄이 표에 지정된 높이를 그대로 쓴다. */
class FixedTableRowHeights extends TableRowHeights {
  /** 내용과 무관하게 표가 정한 높이를 쓴다. */
  heightFor(
    element: TableElement,
    _cells: readonly string[],
    _rowOffset: number,
  ): number {
    return element.rowHeight;
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
    rowOffset: number,
  ): number {
    const needed = element.columns.map((column, columnIndex) => this.cellHeight(
      cells[columnIndex] ?? "",
      this.styleOf(element, rowOffset, columnIndex),
      column.width,
    ));
    return Math.max(element.rowHeight, ...needed);
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
  private styleOf(
    element: TableElement,
    rowOffset: number,
    columnIndex: number,
  ): TextStyle {
    return TableCellRole.at(element, rowOffset, columnIndex) === "header"
      ? element.headerStyle
      : element.cellStyle;
  }
}
