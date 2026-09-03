import { Frame, PastedGrid, StaticTableSource, TableColumn, TableElement, TableHeaderCells, TextStyle } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { TableEditor } from "./TableEditor.js";

/** 붙여넣기 전의 표를 만든다. 폭 90mm에 열 둘, 머리글 지정이 남아 있다. */
function existingTable(): TableElement {
  const columns = [
    new TableColumn("item", "항목", "{{row.item}}", 60, "left", null),
    new TableColumn("amount", "금액", "{{row.amount}}", 30, "right", null),
  ];
  return new TableElement(
    "t1", new Frame(10, 10, 90, 30), 0, false,
    new StaticTableSource([{ item: "기본급", amount: "1" }]),
    columns, 7, new TextStyle("MalgunGothic", 9), new TextStyle("MalgunGothic", 9),
    true, "clip", false, new TableHeaderCells([0]),
  );
}

describe("TableEditor.applyGrid", () => {
  const editor = new TableEditor();

  it("첫 줄을 열 이름으로 삼아 열을 만든다", () => {
    const grid = PastedGrid.parse("구분\t제목\t내용\n안내\t점검\t내용1");

    const changed = editor.applyGrid(existingTable(), grid, true);

    expect(changed.columns.map((c) => c.header)).toEqual(["구분", "제목", "내용"]);
  });

  it("나머지 줄을 본문 행으로 만든다", () => {
    const grid = PastedGrid.parse("구분\t제목\n안내\t점검\n공지\t변경");

    const source = editor.applyGrid(existingTable(), grid, true).source;

    expect(source).toBeInstanceOf(StaticTableSource);
    expect((source as StaticTableSource).rows).toEqual([
      { c1: "안내", c2: "점검" },
      { c1: "공지", c2: "변경" },
    ]);
  });

  it("첫 줄도 본문으로 쓸 수 있다", () => {
    const grid = PastedGrid.parse("안내\t점검");

    const changed = editor.applyGrid(existingTable(), grid, false);

    expect(changed.columns.map((c) => c.header)).toEqual(["", ""]);
    expect((changed.source as StaticTableSource).rows).toEqual([{ c1: "안내", c2: "점검" }]);
  });

  it("표의 가로 폭을 넘기지 않는다", () => {
    const grid = PastedGrid.parse("가\t나\t다\t라\t마\t바");

    const changed = editor.applyGrid(existingTable(), grid, true);
    const total = changed.columns.reduce((sum, c) => sum + c.width, 0);

    expect(total).toBeLessThanOrEqual(90.1);
  });

  it("머리글 지정을 비운다 — 새 격자에서 다시 정해야 한다", () => {
    const grid = PastedGrid.parse("구분\t제목\n안내\t점검");

    expect(editor.applyGrid(existingTable(), grid, true).headerCells.hasColumn(0)).toBe(false);
  });

  it("칸 안의 줄바꿈을 머리글에 그대로 넣는다", () => {
    const grid = PastedGrid.parse("NO\t\"등록\n번호\"");

    expect(editor.applyGrid(existingTable(), grid, true).columns[1]?.header)
      .toBe("등록\n번호");
  });

  it("붙여넣을 것이 없으면 표를 건드리지 않고 거부한다", () => {
    expect(() => editor.applyGrid(existingTable(), PastedGrid.parse(""), true))
      .toThrow("붙여넣을 표 내용이 없다");
  });

  it("표의 자리와 글자 표현은 그대로 둔다", () => {
    const grid = PastedGrid.parse("구분\t제목");

    const changed = editor.applyGrid(existingTable(), grid, true);

    expect(changed.frame).toEqual(existingTable().frame);
    expect(changed.rowHeight).toBe(7);
  });
});
