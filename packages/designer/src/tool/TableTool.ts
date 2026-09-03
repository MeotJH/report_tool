import {
  Frame,
  StaticTableSource,
  TableColumn,
  TableElement,
} from "@report-tool/core";
import type { DocumentFont } from "./DocumentFont.js";
import { DragCreateTool } from "./EditorTool.js";

/**
 * 직접 셀을 입력할 정적 표를 MVP의 두 열 기본값으로 추가한다.
 *
 * 빈 행을 미리 넣어 두는 이유는, 행이 하나도 없으면 더블클릭으로 입력할 셀도
 * 없어서 표를 만든 직후 사용자가 아무것도 할 수 없기 때문이다.
 */
export class TableTool extends DragCreateTool {
  /** 만든 직후 바로 입력할 수 있는 최소 행 수다. */
  private static readonly INITIAL_ROWS = 3;
  public readonly kind = "table" as const;

  /** 항목과 금액 두 열에 빈 행 세 개를 가진 편집 가능한 기본 표를 만든다. */
  protected createElement(frame: Frame, font: DocumentFont): TableElement {
    const columnWidth = frame.width / 2;
    const headerStyle = font.style(9, { weight: 700 });
    const cellStyle = font.style(9);
    const columns = this.createColumns(columnWidth);
    return new TableElement(
      this.createId(), frame, 0, false, this.createEmptyRows(columns),
      columns, 7, headerStyle, cellStyle, true, "clip",
    );
  }

  /** 모든 초기 행이 현재 열 구조와 같은 키를 갖게 한다. */
  private createEmptyRows(columns: readonly TableColumn[]): StaticTableSource {
    const emptyRow = Object.fromEntries(columns.map((column) => [column.key, ""]));
    return new StaticTableSource(
      Array.from({ length: TableTool.INITIAL_ROWS }, () => ({ ...emptyRow })),
    );
  }

  /** MVP 표의 열 구성을 한곳에 두어 이후 속성 패널 확장 지점을 명확히 한다. */
  private createColumns(width: number): readonly TableColumn[] {
    return [
      new TableColumn("item", "항목", "{{row.item}}", width, "left", null),
      new TableColumn("amount", "금액", "{{row.amount}}", width, "right", null),
    ];
  }
}
