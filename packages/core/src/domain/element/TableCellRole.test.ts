import { describe, expect, it } from "vitest";
import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { TableCellRole } from "./TableCellRole.js";
import { TableColumn } from "./TableColumn.js";
import { TableElement } from "./TableElement.js";
import { TableHeaderCells } from "./TableHeaderCells.js";
import { StaticTableSource } from "./TableSource.js";

/** 역할 판정에만 필요한 최소 표를 만든다. */
function createTable(showHeader: boolean, headerCells: TableHeaderCells): TableElement {
  const columns = [
    new TableColumn("label", "항목", "{{row.label}}", 40, "left", null),
    new TableColumn("value", "값", "{{row.value}}", 60, "left", null),
  ];
  return new TableElement(
    "t1", new Frame(0, 0, 100, 40), 0, false,
    new StaticTableSource([{ label: "기간", value: "7월" }, { label: "합계", value: "23" }]),
    columns, 8, new TextStyle("Pretendard", 9, { weight: 700 }),
    new TextStyle("Pretendard", 9), showHeader, "clip", false, headerCells,
  );
}

describe("TableCellRole", () => {
  it("머리글 행을 표시하면 맨 윗줄 전체가 머리글이다", () => {
    const table = createTable(true, TableHeaderCells.none());

    expect(TableCellRole.at(table, 0, 0)).toBe("header");
    expect(TableCellRole.at(table, 0, 1)).toBe("header");
    expect(TableCellRole.at(table, 1, 0)).toBe("body");
  });

  it("머리글 열은 모든 줄에서 머리글이다", () => {
    const table = createTable(false, new TableHeaderCells([0]));

    expect(TableCellRole.at(table, 0, 0)).toBe("header");
    expect(TableCellRole.at(table, 1, 0)).toBe("header");
    expect(TableCellRole.at(table, 1, 1)).toBe("body");
  });

  it("머리글 행 지정은 머리글 행 표시 여부와 무관하게 같은 본문 행을 가리킨다", () => {
    const withoutHeader = createTable(false, new TableHeaderCells([], [1]));
    const withHeader = createTable(true, new TableHeaderCells([], [1]));

    expect(TableCellRole.at(withoutHeader, 1, 1)).toBe("header");
    expect(TableCellRole.at(withHeader, 2, 1)).toBe("header");
    expect(TableCellRole.at(withHeader, 1, 1)).toBe("body");
  });

  it("지정이 없으면 본문이다", () => {
    const table = createTable(false, TableHeaderCells.none());

    expect(TableCellRole.at(table, 0, 0)).toBe("body");
  });
});
