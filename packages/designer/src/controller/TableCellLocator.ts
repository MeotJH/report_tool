import { Frame, StaticTableSource, type TableElement } from "@report-tool/core";
import type { CanvasEditTarget } from "./CanvasEditTarget.js";
import { TableEditor } from "./TableEditor.js";

/**
 * 표 안의 좌표와 편집 대상, 그리고 그 대상이 차지하는 영역을 한 규칙으로 계산한다.
 *
 * 더블클릭 판정과 입력기 배치가 서로 다른 계산을 쓰면 사용자가 누른 셀과 입력창이
 * 뜨는 셀이 어긋난다. 두 방향 계산을 같은 클래스에 둬서 그것을 막는다.
 */
export class TableCellLocator {
  private readonly tableEditor = new TableEditor();

  /**
   * 표 안에서 더블클릭한 지점이 **어디인지**만 판단한다.
   *
   * 그 자리를 고칠 수 있는지는 여기서 묻지 않는다. 두 물음을 한자리에서 답하면
   * "고칠 수 없는 자리"와 "아무것도 없는 자리"가 같은 답(`undefined`)이 되어,
   * 왜 안 되는지 말해 줄 기회가 사라진다. 실제로 데이터 표의 값을 더블클릭하면
   * 아무 일도 일어나지 않았고, 사용자는 자기가 잘못 눌렀다고 생각했다.
   */
  targetAt(table: TableElement, xMm: number, yMm: number): CanvasEditTarget | undefined {
    const columnIndex = this.tableEditor.columnIndexAtOffset(table, xMm - table.frame.x);
    if (columnIndex === undefined) return undefined;
    const rowOffset = Math.floor((yMm - table.frame.y) / table.rowHeight);
    if (rowOffset < 0) return undefined;
    if (table.showHeader && rowOffset === 0) {
      return { kind: "tableHeader", elementId: table.id, columnIndex };
    }
    const rowIndex = rowOffset - (table.showHeader ? 1 : 0);
    if (!this.hasRowAt(table, rowIndex)) return undefined;
    return { kind: "tableCell", elementId: table.id, rowIndex, columnIndex };
  }

  /** 편집 대상이 차지하는 문서 영역을 계산해 입력기를 정확히 겹치게 한다. */
  frameOf(table: TableElement, target: CanvasEditTarget): Frame {
    if (target.kind === "text") {
      throw new Error("표 대상이 아닌 편집 영역은 계산할 수 없다");
    }
    const columnIndex = target.columnIndex;
    const left = table.columns
      .slice(0, columnIndex)
      .reduce((sum, column) => sum + column.width, 0);
    const width = table.columns[columnIndex]?.width ?? 0;
    return new Frame(
      table.frame.x + left,
      table.frame.y + table.rowHeight * this.rowOffsetOf(table, target),
      width,
      table.rowHeight,
    );
  }

  /**
   * Tab으로 이동할 다음 편집 대상을 찾는다.
   *
   * 오른쪽 끝에서 다음 행 첫 열로 넘어가는 것은 표 입력의 일반적인 기대다.
   * 더 갈 곳이 없으면 undefined를 반환해 입력을 끝낸다.
   */
  nextTarget(
    table: TableElement,
    target: CanvasEditTarget,
    direction: 1 | -1,
  ): CanvasEditTarget | undefined {
    if (target.kind === "text") return undefined;
    const flat = this.editableTargets(table);
    const current = flat.findIndex((candidate) => this.isSame(candidate, target));
    if (current === -1) return undefined;
    return flat[current + direction];
  }

  /** 헤더와 본문 셀을 사용자가 이동하는 순서대로 한 줄로 펼친다. */
  private editableTargets(table: TableElement): readonly CanvasEditTarget[] {
    const targets: CanvasEditTarget[] = [];
    if (table.showHeader) {
      for (const [columnIndex] of table.columns.entries()) {
        targets.push({ kind: "tableHeader", elementId: table.id, columnIndex });
      }
    }
    for (let rowIndex = 0; rowIndex < this.editableRowCount(table); rowIndex += 1) {
      for (const [columnIndex] of table.columns.entries()) {
        targets.push({ kind: "tableCell", elementId: table.id, rowIndex, columnIndex });
      }
    }
    return targets;
  }

  /** 편집 대상이 표에서 몇 번째 줄에 그려지는지 계산한다. */
  private rowOffsetOf(table: TableElement, target: CanvasEditTarget): number {
    if (target.kind === "tableHeader") return 0;
    if (target.kind === "text") return 0;
    return target.rowIndex + (table.showHeader ? 1 : 0);
  }

  /** 저장된 정적 행 안의 위치만 셀 편집 대상으로 인정한다. */
  private isEditableRow(table: TableElement, rowIndex: number): boolean {
    return rowIndex >= 0 && rowIndex < this.editableRowCount(table);
  }

  /**
   * 그 자리에 행이 있는지만 본다. 고칠 수 있는지는 따지지 않는다.
   *
   * 데이터 표의 행 수는 발행 데이터가 정하므로 편집 중에는 알 수 없다. 표 안을
   * 눌렀다면 행이 있는 것으로 본다 — 어차피 요소를 찾은 것이 프레임 안이다.
   */
  private hasRowAt(table: TableElement, rowIndex: number): boolean {
    if (rowIndex < 0) return false;
    if (table.source instanceof StaticTableSource) {
      return rowIndex < table.source.rows.length;
    }
    return true;
  }

  /** 데이터 표는 직접 입력할 행이 없으므로 0으로 본다. */
  private editableRowCount(table: TableElement): number {
    if (!(table.source instanceof StaticTableSource)) return 0;
    return table.source.rows.length;
  }

  /** 같은 대상인지 종류와 위치를 함께 비교한다. */
  private isSame(first: CanvasEditTarget, second: CanvasEditTarget): boolean {
    if (first.kind !== second.kind) return false;
    if (first.kind === "tableHeader" && second.kind === "tableHeader") {
      return first.columnIndex === second.columnIndex;
    }
    if (first.kind === "tableCell" && second.kind === "tableCell") {
      return first.rowIndex === second.rowIndex
        && first.columnIndex === second.columnIndex;
    }
    return first.elementId === second.elementId;
  }
}
