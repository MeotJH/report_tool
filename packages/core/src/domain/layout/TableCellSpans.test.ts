import { describe, expect, it } from "vitest";
import { TableColumn } from "../element/TableColumn.js";
import { TableElement } from "../element/TableElement.js";
import { StaticTableSource } from "../element/TableSource.js";
import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { TableCellSpans } from "./TableCellSpans.js";

const style = new TextStyle("Pretendard", 8);

/** 원본 리포트의 업무별 통계처럼 머리글 하나가 두 칸을 덮는 표를 만든다. */
function statsTable(spans: readonly number[]): TableElement {
  const headers = ["해결건수", "처리시간", "비율", "해결률"];
  const columns = headers.map((header, index) => new TableColumn(
    `c${index}`, header, `{{row.c${index}}}`, 20, "center", null, spans[index] ?? 1,
  ));
  return new TableElement(
    "stats", new Frame(15, 20, 80, 40), 1, false,
    new StaticTableSource([]), columns, 6, style, style, true, "clip",
  );
}

describe("TableCellSpans", () => {
  it("열 이름 줄에서 병합한 칸이 뒤 열을 덮는다", () => {
    const spans = TableCellSpans.forRow(statsTable([1, 2, 1, 1]), null);

    expect(spans.toArray()).toEqual([1, 2, 0, 1]);
  });

  it("본문 행은 병합하지 않는다", () => {
    const spans = TableCellSpans.forRow(statsTable([1, 2, 1, 1]), 0);

    expect(spans.toArray()).toEqual([1, 1, 1, 1]);
  });

  it("덮인 칸이 다시 덮지 못한다", () => {
    // 두 번째 열이 세 번째를 덮었으므로 세 번째의 선언은 무시된다.
    const spans = TableCellSpans.forRow(statsTable([1, 2, 2, 1]), null);

    expect(spans.toArray()).toEqual([1, 2, 0, 1]);
  });

  it("마지막 열을 넘는 병합은 남은 열까지만 덮는다", () => {
    const spans = TableCellSpans.forRow(statsTable([1, 1, 1, 5]), null);

    expect(spans.toArray()).toEqual([1, 1, 1, 1]);
  });

  it("병합한 칸의 폭은 덮은 열의 폭을 합한 값이다", () => {
    const table = statsTable([1, 2, 1, 1]);
    const spans = TableCellSpans.forRow(table, null);

    expect(spans.widthMm(table.columns, 1)).toBe(40);
    expect(spans.widthMm(table.columns, 0)).toBe(20);
  });

  it("병합이 없으면 모든 칸이 자기 열 하나씩이다", () => {
    const spans = TableCellSpans.forRow(statsTable([1, 1, 1, 1]), null);

    expect(spans.toArray()).toEqual([1, 1, 1, 1]);
  });

  it("0이나 음수를 넣어도 최소 한 열은 덮는다", () => {
    const spans = TableCellSpans.forRow(statsTable([0, 1, 1, 1]), null);

    expect(spans.toArray()).toEqual([1, 1, 1, 1]);
  });
});
