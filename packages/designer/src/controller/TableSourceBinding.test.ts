import {
  Binding,
  BoundTableSource,
  Frame,
  StaticTableSource,
  TableColumn,
  TableElement,
  TemplateVariable,
  TextStyle,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { PaletteEntryBuilder, type PaletteEntry } from "./PaletteEntry.js";
import { TableEditor } from "./TableEditor.js";

const style = new TextStyle("Pretendard", 9);

const entries = new PaletteEntryBuilder().build([
  new TemplateVariable("payItems", "지급 항목", "array"),
  new TemplateVariable("payItems.item", "항목", "string"),
  new TemplateVariable("payItems.amount", "금액", "currency"),
  new TemplateVariable("deductionItems", "공제 항목", "array"),
  new TemplateVariable("deductionItems.name", "공제명", "string"),
  new TemplateVariable("deductionItems.amount", "금액", "currency"),
  new TemplateVariable("deductionItems.rate", "요율", "number"),
]);

/** 경로로 배열 항목을 찾는다. */
function arrayOf(path: string): PaletteEntry {
  const found = entries.find((entry) => entry.path === path);
  if (found === undefined) throw new Error(`배열 ${path}를 찾지 못했다`);
  return found;
}

/** 열 두 개짜리 표를 Source만 바꿔 만든다. */
function table(source: StaticTableSource | BoundTableSource): TableElement {
  return new TableElement(
    "t", new Frame(20, 20, 170, 30), 0, false, source,
    [
      new TableColumn("item", "항목", "{{row.item}}", 110, "left", null),
      new TableColumn("amount", "금액", "{{row.amount}}", 60, "right", null),
    ],
    7, style, style, true, "clip",
  );
}

describe("TableEditor 배열 연결", () => {
  const editor = new TableEditor();

  it("표를 배열에 연결하고 열을 그 배열의 자식으로 다시 만든다", () => {
    const bound = editor.bindArray(
      table(new StaticTableSource([])), "deductionItems", arrayOf("deductionItems").children,
    );

    expect(bound.source).toBeInstanceOf(BoundTableSource);
    expect(bound.columns.map((column) => column.key)).toEqual(["name", "amount", "rate"]);
  });

  it("연결을 바꿔도 열 너비 합은 표 너비와 같다", () => {
    const bound = editor.bindArray(
      table(new StaticTableSource([])), "deductionItems", arrayOf("deductionItems").children,
    );

    const total = bound.columns.reduce((sum, column) => sum + column.width, 0);
    expect(total).toBeCloseTo(170, 5);
  });

  it("연결을 바꿔도 배치와 스타일은 그대로 둔다", () => {
    const original = table(new BoundTableSource(new Binding("payItems")));

    const bound = editor.bindArray(original, "deductionItems", arrayOf("deductionItems").children);

    expect(bound.frame.equals(original.frame)).toBe(true);
    expect(bound.rowHeight).toBe(original.rowHeight);
    expect(bound.showHeader).toBe(original.showHeader);
  });

  it("사라질 정적 행 수를 알려 준다", () => {
    const withRows = table(new StaticTableSource([
      { item: "기본급", amount: 1 },
      { item: "식대", amount: 2 },
    ]));

    expect(editor.discardedRowCount(withRows)).toBe(2);
  });

  it("데이터 표에는 사라질 입력 행이 없다", () => {
    expect(editor.discardedRowCount(table(new BoundTableSource(new Binding("payItems")))))
      .toBe(0);
  });

  it("연결한 열은 배열 자식의 표시 이름을 헤더로 쓴다", () => {
    const bound = editor.bindArray(
      table(new StaticTableSource([])), "deductionItems", arrayOf("deductionItems").children,
    );

    expect(bound.columns.map((column) => column.header)).toEqual(["공제명", "금액", "요율"]);
  });
});
