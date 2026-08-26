import type { TableElement } from "./TableElement.js";

/** 표 한 칸이 값의 이름인지 값 자체인지 구분한다. */
export type CellRole = "header" | "body";

/**
 * 표의 한 칸이 머리글인지 본문인지 한 곳에서 정한다.
 *
 * 캔버스와 PDF가 각자 판단하면 반드시 어긋난다. 실제로 이 규칙이 생기기 전까지
 * 캔버스는 헤더 행에 배경을 칠하고 PDF는 칠하지 않아서, 담당자가 본 표와 서명자가
 * 받은 표의 머리글이 서로 다르게 보였다. 판단은 도메인에 하나만 둔다.
 */
export class TableCellRole {
  /**
   * 표에서 실제로 그려지는 줄 번호와 열 번호로 그 칸의 역할을 정한다.
   *
   * `rowOffset`은 머리글 행을 포함해 위에서부터 센 줄 번호다. 렌더러가 그리는
   * 순서와 같은 기준이어야 "몇 번째 줄에 무엇을 칠할지"가 어긋나지 않는다.
   */
  static at(table: TableElement, rowOffset: number, columnIndex: number): CellRole {
    if (table.showHeader && rowOffset === 0) return "header";
    if (table.headerCells.hasColumn(columnIndex)) return "header";
    return table.headerCells.hasRow(TableCellRole.bodyRowIndex(table, rowOffset))
      ? "header"
      : "body";
  }

  /** 머리글 행 표시 여부와 무관하게 몇 번째 본문 행인지 계산한다. */
  static bodyRowIndex(table: TableElement, rowOffset: number): number {
    return rowOffset - (table.showHeader ? 1 : 0);
  }
}
