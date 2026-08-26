import type { TableElement } from "../element/TableElement.js";
import { TableCellText } from "./TableCellText.js";

/** 표의 한 줄이 어디에 어떤 문자열로 그려지는지 렌더러가 그대로 쓸 수 있게 담는다. */
export interface TableLayoutRow {
  /** 열 순서대로 그려질 최종 문자열이다. */
  readonly cells: readonly string[];
  /** 머리글을 포함해 위에서부터 센 줄 번호다. 머리글 판정이 이 값을 쓴다. */
  readonly offset: number;
  /** 표 프레임 위쪽에서 이 줄까지의 거리(mm)다. */
  readonly topMm: number;
  /** 이 줄의 높이(mm)다. */
  readonly heightMm: number;
}

/** 표 하나를 그리는 데 필요한 줄 목록과, 영역을 넘어 빠진 줄 수를 함께 담는다. */
export interface TableLayoutResult {
  /** 실제로 그릴 줄만 담는다. 영역을 넘는 줄은 여기에 없다. */
  readonly rows: readonly TableLayoutRow[];
  /** 표 영역을 넘어 그리지 못한 줄 수다. 0이 아니면 발행 시 그만큼 사라진다. */
  readonly droppedRowCount: number;
}

/**
 * 표가 몇 줄로, 어떤 값으로, 어디에 그려지는지를 도메인 한 곳에서 정한다.
 *
 * 이 계산을 캔버스와 PDF가 각자 하던 동안 세 화면이 서로 다른 표를 보여 주었다.
 * 설계 화면은 자리표시자 한 줄, 미리보기는 앞의 세 줄, 발행본은 영역에 들어가는
 * 만큼. 담당자는 화면에서 여유가 있어 보이는 표를 만들고, 발행본에서는 행이
 * 말없이 사라졌다. **어느 화면에서 보든 같은 데이터면 같은 표여야 한다.**
 *
 * 넘치는 줄도 마찬가지다. 캔버스는 영역 밖에 계속 그리고 PDF는 조용히 버리는 대신,
 * 여기서 한 번만 잘라 내고 몇 줄이 빠졌는지 함께 돌려준다. 그래야 편집기가 그
 * 사실을 경고로 알릴 수 있다.
 */
export class TableLayout {
  /** 편집 중과 발행본의 차이를 셀 표현 방식 하나로만 두어 계산을 공유한다. */
  constructor(private readonly cellText: TableCellText = TableCellText.resolved()) {}

  /** 표와 데이터를 실제로 그릴 줄 목록으로 바꾼다. */
  compute(element: TableElement, data: unknown): TableLayoutResult {
    const cells = this.allRowCells(element, data);
    return this.fitToFrame(element, cells);
  }

  /** 머리글과 본문을 그리는 순서대로 이어 붙인다. */
  private allRowCells(
    element: TableElement,
    data: unknown,
  ): readonly (readonly string[])[] {
    const header = element.showHeader
      ? [element.columns.map((column) => column.header)]
      : [];
    return [...header, ...this.bodyRowCells(element, data)];
  }

  /**
   * 본문 줄을 만든다. 행이 없고 행 수가 발행 시점에 정해지는 표만 자리표시자를 쓴다.
   *
   * 정적 표에 자리표시자를 만들면, 행을 모두 지운 사용자에게 지워지지 않는 행이
   * 하나 남은 것처럼 보인다. 그 줄은 더블클릭해도 편집되지 않고 발행본에도 없다.
   */
  private bodyRowCells(
    element: TableElement,
    data: unknown,
  ): readonly (readonly string[])[] {
    const rows = element.source.resolveRows(data);
    if (rows.length > 0) {
      return rows.map((row) => this.cellText.cellsFor(element.columns, row, data));
    }
    if (!element.source.deferredRows()) return [];
    const placeholder = this.cellText.placeholderCells(element.columns);
    return placeholder === null ? [] : [placeholder];
  }

  /**
   * 표 영역에 들어가는 줄만 남기고 나머지는 세어 둔다.
   *
   * 자르는 규칙이 한 곳에만 있어야 "화면에서 잘린 줄은 발행본에서도 잘린다"가
   * 성립한다.
   */
  private fitToFrame(
    element: TableElement,
    allCells: readonly (readonly string[])[],
  ): TableLayoutResult {
    const rows: TableLayoutRow[] = [];
    let topMm = 0;
    for (const [offset, cells] of allCells.entries()) {
      const heightMm = element.rowHeight;
      if (topMm + heightMm > element.frame.height) {
        return { rows, droppedRowCount: allCells.length - offset };
      }
      rows.push({ cells, offset, topMm, heightMm });
      topMm += heightMm;
    }
    return { rows, droppedRowCount: 0 };
  }
}
