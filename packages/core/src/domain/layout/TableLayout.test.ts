import { describe, expect, it } from "vitest";
import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { TableColumn } from "../element/TableColumn.js";
import { TableElement } from "../element/TableElement.js";
import { BoundTableSource, StaticTableSource, type TableRow } from "../element/TableSource.js";
import { TableCellText } from "./TableCellText.js";
import { TableLayout } from "./TableLayout.js";

/** 행에서 값을 꺼내는 평범한 열을 짧게 만든다. */
function column(key: string, header = key): TableColumn {
  return new TableColumn(key, header, `{{row.${key}}}`, 30, "left", null);
}

/** 높이와 행 출처만 바꿔 가며 같은 표를 반복해서 만든다. */
function table(options: {
  source: StaticTableSource | BoundTableSource;
  heightMm?: number;
  rowHeightMm?: number;
  showHeader?: boolean;
}): TableElement {
  return new TableElement(
    "t", new Frame(10, 10, 60, options.heightMm ?? 100), 1, false,
    options.source,
    [column("item", "항목"), column("amount", "금액")],
    options.rowHeightMm ?? 10,
    new TextStyle("Pretendard", 9, { weight: 700 }),
    new TextStyle("Pretendard", 9),
    options.showHeader ?? true,
    "clip",
  );
}

/** 사람마다 행 수가 달라지는 표를 만든다. */
function boundTable(heightMm = 100): TableElement {
  return table({ source: new BoundTableSource(new Binding("payItems")), heightMm });
}

/** 템플릿에 행을 직접 저장해 둔 표를 만든다. */
function staticTable(rows: readonly TableRow[], heightMm = 100): TableElement {
  return table({ source: new StaticTableSource(rows), heightMm });
}

/** 지급 항목 세 줄을 담은 발행 데이터를 만든다. */
function threeRows(): unknown {
  return {
    payItems: [
      { item: "기본급", amount: 4200000 },
      { item: "식대", amount: 200000 },
      { item: "야근수당", amount: 315000 },
    ],
  };
}

describe("TableLayout", () => {
  const published = new TableLayout(TableCellText.resolved());
  const designed = new TableLayout(TableCellText.source());

  it("머리글을 첫 줄로 두고 본문을 이어 붙인다", () => {
    const result = published.compute(boundTable(), threeRows());

    expect(result.rows.map((row) => row.cells[0]))
      .toEqual(["항목", "기본급", "식대", "야근수당"]);
    expect(result.rows.map((row) => row.offset)).toEqual([0, 1, 2, 3]);
  });

  it("줄마다 표 위쪽에서의 거리를 함께 알려준다", () => {
    const result = published.compute(boundTable(), threeRows());

    expect(result.rows.map((row) => row.topMm)).toEqual([0, 10, 20, 30]);
    expect(result.rows.every((row) => row.heightMm === 10)).toBe(true);
  });

  it("머리글을 끄면 본문이 첫 줄이 된다", () => {
    const element = table({
      source: new BoundTableSource(new Binding("payItems")),
      showHeader: false,
    });

    const result = published.compute(element, threeRows());

    expect(result.rows.map((row) => row.cells[0])).toEqual(["기본급", "식대", "야근수당"]);
    expect(result.rows[0]?.topMm).toBe(0);
  });

  it("표 영역을 넘는 줄은 그리지 않고 몇 줄이 빠졌는지 센다", () => {
    const result = published.compute(boundTable(25), threeRows());

    expect(result.rows.map((row) => row.cells[0])).toEqual(["항목", "기본급"]);
    expect(result.droppedRowCount).toBe(2);
  });

  it("영역에 다 들어가면 빠진 줄이 없다", () => {
    const result = published.compute(boundTable(), threeRows());

    expect(result.droppedRowCount).toBe(0);
  });

  it("설계와 발행이 같은 데이터에서 같은 줄 수를 만든다", () => {
    const element = boundTable();

    expect(designed.compute(element, threeRows()).rows.length)
      .toBe(published.compute(element, threeRows()).rows.length);
  });

  it("발행은 셀에 적은 표현식을 문서 데이터로 채운다", () => {
    const element = staticTable([{ item: "기본급", amount: "{{baseSalary}}" }]);

    const result = published.compute(element, { baseSalary: 4200000 });

    expect(result.rows[1]?.cells).toEqual(["기본급", "4200000"]);
  });

  it("설계는 셀에 적은 표현식을 그대로 보여 준다", () => {
    const element = staticTable([{ item: "기본급", amount: "{{baseSalary}}" }]);

    const result = designed.compute(element, { baseSalary: 4200000 });

    expect(result.rows[1]?.cells).toEqual(["기본급", "{{baseSalary}}"]);
  });

  it("설계 화면은 데이터가 없는 데이터 표에 자리표시자 한 줄을 둔다", () => {
    const result = designed.compute(boundTable(), {});

    expect(result.rows.map((row) => row.cells)).toEqual([
      ["항목", "금액"],
      ["⟨item⟩", "⟨amount⟩"],
    ]);
  });

  it("발행본은 데이터가 없으면 본문을 만들지 않는다", () => {
    const result = published.compute(boundTable(), {});

    expect(result.rows.map((row) => row.cells)).toEqual([["항목", "금액"]]);
  });

  it("행을 모두 지운 정적 표에는 자리표시자를 만들지 않는다", () => {
    const result = designed.compute(staticTable([]), {});

    expect(result.rows.map((row) => row.cells)).toEqual([["항목", "금액"]]);
  });
});
