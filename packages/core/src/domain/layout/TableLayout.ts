import { TableCellRole, type CellRole } from "../element/TableCellRole.js";
import type { TableElement } from "../element/TableElement.js";
import { TableCellSpans } from "./TableCellSpans.js";
import { TableRowSplit } from "./TableRowSplit.js";
import { TableCellText } from "./TableCellText.js";
import { TableRowHeights } from "./TableRowHeights.js";

/** 표의 한 줄이 어디에 어떤 문자열로 그려지는지 렌더러가 그대로 쓸 수 있게 담는다. */
export interface TableLayoutRow {
  /** 열 순서대로 그려질 최종 문자열이다. */
  readonly cells: readonly string[];
  /** 칸마다의 역할이다. 렌더러는 이 값으로만 머리글 표현을 정한다. */
  readonly roles: readonly CellRole[];
  /**
   * 칸마다 덮는 열 수다. `0`이면 앞 칸이 덮으므로 그리지 않고 자리만 넘긴다.
   *
   * 렌더러가 열 정의를 다시 보고 병합을 판단하면 캔버스와 발행본이 갈라진다.
   */
  readonly spans: readonly number[];
  /** 몇 번째 본문 행인지다. 열 이름을 보여 주는 머리글 줄이면 `null`이다. */
  readonly bodyIndex: number | null;
  /** 이 배치 안에서 위에서부터 센 줄 번호다. */
  readonly offset: number;
  /** 배치 영역 위쪽에서 이 줄까지의 거리(mm)다. */
  readonly topMm: number;
  /** 이 줄의 높이(mm)다. */
  readonly heightMm: number;
}

/** 한 자리에 그릴 표 조각과, 다음 쪽으로 넘길 것이 있는지를 함께 담는다. */
export interface TableLayoutResult {
  /** 이 자리에 실제로 그릴 줄이다. */
  readonly rows: readonly TableLayoutRow[];
  /** 이어서 그려야 할 첫 본문 행 번호다. 남은 것이 없으면 `null`이다. */
  readonly nextBodyRowIndex: number | null;
  /**
   * 그 행을 몇 번째 줄부터 이어 그릴지다. 행 첫 줄부터면 0이다.
   *
   * 행이 쪽 사이에서 잘렸다는 사실은 이 값에만 남는다. 렌더러가 다시 세면
   * 앞 쪽에 그린 줄을 다음 쪽에 또 그린다.
   */
  readonly nextLineOffset: number;
  /** 이 자리에 담지 못한 본문 행 수다. 이어 그리지 않으면 그만큼 사라진다. */
  readonly remainingRowCount: number;
}

/** 표 조각을 어느 크기 안에, 몇 번째 행부터 그릴지 정한다. */
export interface TableChunkOptions {
  /** 이 조각이 쓸 수 있는 높이(mm)다. 기본은 표 자신의 높이다. */
  readonly frameHeightMm?: number;
  /** 이 조각이 시작할 본문 행 번호다. 기본은 처음부터다. */
  readonly startBodyRowIndex?: number;
  /** 첫 행을 몇 번째 줄부터 이어 그릴지다. 기본은 행 첫 줄부터다. */
  readonly startLineOffset?: number;
  /**
   * 한 줄도 들어가지 않아도 본문 한 줄은 반드시 담을지 정한다.
   *
   * 새 쪽은 표가 가질 수 있는 가장 넓은 자리다. 거기에도 들어가지 않는 줄을
   * 계속 다음 쪽으로 미루면 쪽이 무한히 늘어난다. 진행을 보장해야 한다.
   */
  readonly forceFirstBodyRow?: boolean;
}

/**
 * 표가 몇 줄로, 어떤 값으로, 어디에 그려지는지를 도메인 한 곳에서 정한다.
 *
 * 이 계산을 캔버스와 PDF가 각자 하던 동안 세 화면이 서로 다른 표를 보여 주었다.
 * 설계 화면은 자리표시자 한 줄, 미리보기는 앞의 세 줄, 발행본은 영역에 들어가는
 * 만큼. 담당자는 화면에서 여유가 있어 보이는 표를 만들고, 발행본에서는 행이
 * 말없이 사라졌다. **어느 화면에서 보든 같은 데이터면 같은 표여야 한다.**
 *
 * 자리에 다 들어가지 않는 줄은 버리지 않고 "다음은 여기부터"라고 알려 준다.
 * 그 답을 받아 쪽을 넘기는 것은 `DocumentLayout`의 일이다.
 */
export class TableLayout {
  /**
   * 편집 중과 발행본의 차이를 셀 표현 방식 하나로만 두어 계산을 공유한다.
   *
   * 행 높이는 글자를 잴 수 있는 곳에서만 내용에 맞춰 늘어난다. 재지 못하는
   * 곳에서도 줄 목록과 자르는 규칙은 같으므로 결과가 갈리지 않는다.
   */
  constructor(
    private readonly cellText: TableCellText = TableCellText.resolved(),
    private readonly rowHeights: TableRowHeights = TableRowHeights.fixed(),
  ) {}

  /** 표와 데이터를 한 자리에 그릴 줄 목록으로 바꾼다. */
  compute(
    element: TableElement,
    data: unknown,
    options: TableChunkOptions = {},
  ): TableLayoutResult {
    const bodyCells = this.bodyRowCells(element, data);
    return this.fill(element, bodyCells, options.startBodyRowIndex ?? 0, options);
  }

  /**
   * 그려질 수 있는 모든 칸의 문자열을 준다. 자리에 들어가는지는 가리지 않는다.
   *
   * 폰트 서브셋을 만드는 쪽이 쓴다. 그 시점에는 폰트를 아직 임베딩하지 않아
   * 글자 폭을 잴 수 없고, 따라서 어느 줄이 어느 쪽에 들어가는지도 알 수 없다.
   * 서브셋은 넉넉한 편이 안전하다 — 모자라면 그 자리가 통째로 빈칸으로 발행된다.
   */
  cellsOf(element: TableElement, data: unknown): readonly (readonly string[])[] {
    const header = element.showHeader ? [this.headerCells(element)] : [];
    return [...header, ...this.bodyRowCells(element, data)];
  }

  /** 열 이름 줄의 문자열을 만든다. */
  private headerCells(element: TableElement): readonly string[] {
    return element.columns.map((column) => column.header);
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
   * 주어진 높이가 허락하는 만큼 머리글과 본문을 채운다.
   *
   * 머리글은 조각마다 다시 그린다. 표가 쪽을 넘었을 때 열 이름이 없으면 두 번째
   * 쪽부터는 어느 칸이 무엇인지 알 수 없다.
   */
  private fill(
    element: TableElement,
    bodyCells: readonly (readonly string[])[],
    startBodyRowIndex: number,
    options: TableChunkOptions,
  ): TableLayoutResult {
    const limitMm = options.frameHeightMm ?? element.frame.height;
    const rows: TableLayoutRow[] = [];
    let topMm = 0;
    if (element.showHeader) {
      const header = this.createRow(element, this.headerCells(element), null, 0, topMm);
      // 머리글조차 들어가지 않는 자리에서 본문까지 미루면 다음 쪽도 같은 판단을 해
      // 쪽이 무한히 늘어난다. 진행을 보장해야 할 때는 머리글을 포기하고 본문을 그린다.
      if (header.heightMm <= limitMm) {
        rows.push(header);
        topMm += header.heightMm;
      } else if (options.forceFirstBodyRow !== true) {
        return this.result(rows, startBodyRowIndex, 0, bodyCells.length);
      }
    }
    let lineOffset = options.startLineOffset ?? 0;
    for (let index = startBodyRowIndex; index < bodyCells.length; index += 1) {
      const cells = this.continuedCells(element, bodyCells[index] ?? [], index, lineOffset);
      const row = this.createRow(element, cells, index, rows.length, topMm);
      if (topMm + row.heightMm <= limitMm) {
        rows.push(row);
        topMm += row.heightMm;
        lineOffset = 0;
        continue;
      }
      const partial = this.splitRow(element, cells, index, rows.length, topMm, limitMm);
      if (partial !== null) {
        rows.push(partial.row);
        return this.result(rows, index, lineOffset + partial.lineCount, bodyCells.length);
      }
      if (index === startBodyRowIndex && options.forceFirstBodyRow === true) {
        rows.push(row);
        return this.result(rows, null, 0, bodyCells.length);
      }
      return this.result(rows, index, lineOffset, bodyCells.length);
    }
    return this.result(rows, null, 0, bodyCells.length);
  }

  /**
   * 이어 그리는 첫 행이면 이미 그린 줄을 걷어 낸다.
   *
   * 걷어 내지 않으면 앞 쪽에 그린 줄이 다음 쪽에 한 번 더 나온다.
   */
  private continuedCells(
    element: TableElement,
    cells: readonly string[],
    bodyIndex: number,
    lineOffset: number,
  ): readonly string[] {
    if (lineOffset === 0) return cells;
    const lines = this.linesOf(element, cells, bodyIndex);
    if (lines === null) return cells;
    return TableRowSplit.of(lines, lineOffset, Number.MAX_SAFE_INTEGER).cells;
  }

  /**
   * 남은 자리에 들어가는 만큼만 이 행에서 잘라 낸다. 자를 수 없으면 `null`이다.
   *
   * 한 줄도 들어가지 않으면 자르지 않는다. 빈 조각을 남기면 같은 판단이 다음
   * 쪽에서 되풀이되어 쪽이 무한히 늘어난다.
   */
  private splitRow(
    element: TableElement,
    cells: readonly string[],
    bodyIndex: number,
    offset: number,
    topMm: number,
    limitMm: number,
  ): Readonly<{ row: TableLayoutRow; lineCount: number }> | null {
    const lines = this.linesOf(element, cells, bodyIndex);
    if (lines === null) return null;
    const lineHeightMm = this.rowHeights.lineHeightMm(element);
    if (lineHeightMm <= 0) return null;
    const fits = Math.floor((limitMm - topMm) / lineHeightMm);
    if (fits < 1) return null;
    const split = TableRowSplit.of(lines, 0, fits);
    if (split.isComplete() || split.lineCount < 1) return null;
    const roles = this.rolesOf(element, bodyIndex);
    return {
      row: {
        cells: split.cells,
        roles,
        spans: TableCellSpans.forRow(element, bodyIndex).toArray(),
        bodyIndex,
        offset,
        topMm,
        heightMm: split.lineCount * lineHeightMm,
      },
      lineCount: split.lineCount,
    };
  }

  /** 행 자르기와 높이 계산이 같은 줄 목록을 쓰게 한다. */
  private linesOf(
    element: TableElement,
    cells: readonly string[],
    bodyIndex: number,
  ): readonly (readonly string[])[] | null {
    return this.rowHeights.linesOf(
      element, cells, this.rolesOf(element, bodyIndex),
      TableCellSpans.forRow(element, bodyIndex),
    );
  }

  /** 칸의 역할 계산을 한 곳에 모은다. */
  private rolesOf(element: TableElement, bodyIndex: number | null): readonly CellRole[] {
    return element.columns.map(
      (_column, columnIndex) => TableCellRole.of(element, bodyIndex, columnIndex),
    );
  }

  /** 한 줄의 역할·높이·위치를 함께 정해 렌더러가 다시 판단하지 않게 한다. */
  private createRow(
    element: TableElement,
    cells: readonly string[],
    bodyIndex: number | null,
    offset: number,
    topMm: number,
  ): TableLayoutRow {
    const roles = this.rolesOf(element, bodyIndex);
    const spans = TableCellSpans.forRow(element, bodyIndex);
    return {
      cells,
      roles,
      spans: spans.toArray(),
      bodyIndex,
      offset,
      topMm,
      heightMm: this.rowHeights.heightFor(element, cells, roles, spans),
    };
  }

  /** 남은 행 수 계산이 한 곳에서만 이뤄지게 한다. */
  private result(
    rows: readonly TableLayoutRow[],
    nextBodyRowIndex: number | null,
    nextLineOffset: number,
    bodyRowCount: number,
  ): TableLayoutResult {
    return {
      rows,
      nextBodyRowIndex,
      nextLineOffset,
      remainingRowCount: nextBodyRowIndex === null ? 0 : bodyRowCount - nextBodyRowIndex,
    };
  }
}
