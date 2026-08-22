import {
  Frame,
  StaticTableSource,
  TableColumn,
  TableElement,
  TextStyle,
} from "@report-tool/core";
import { DragCreateTool } from "./EditorTool.js";

/** 직접 셀을 입력할 정적 표를 MVP의 두 열 기본값으로 추가한다. */
export class TableTool extends DragCreateTool {
  public readonly kind = "table" as const;

  /** 항목과 금액 두 열을 가진 편집 가능한 기본 표를 만든다. */
  protected createElement(frame: Frame): TableElement {
    const columnWidth = frame.width / 2;
    const headerStyle = new TextStyle("Pretendard", 9, { weight: 700 });
    const cellStyle = new TextStyle("Pretendard", 9);
    return new TableElement(
      this.createId(), frame, 0, false, new StaticTableSource([]),
      this.createColumns(columnWidth), 7, headerStyle, cellStyle, true, "clip",
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
