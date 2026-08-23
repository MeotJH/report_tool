import {
  Binding,
  BoundTableSource,
  Frame,
  StaticTableSource,
  TableColumn,
  TableElement,
  TextStyle,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { TableCellLocator } from "./TableCellLocator.js";

const style = new TextStyle("Pretendard", 9);

/** 열 너비 60/40, 행 높이 10인 표를 (20, 50)에 놓아 좌표 계산을 검증한다. */
function createTable(rowCount: number, showHeader = true): TableElement {
  const rows = Array.from({ length: rowCount }, (_value, index) => ({
    item: `항목${index}`, amount: index * 100,
  }));
  return new TableElement(
    "t", new Frame(20, 50, 100, 40), 0, false, new StaticTableSource(rows),
    [
      new TableColumn("item", "항목", "{{row.item}}", 60, "left", null),
      new TableColumn("amount", "금액", "{{row.amount}}", 40, "right", null),
    ],
    10, style, style, showHeader, "clip",
  );
}

describe("TableCellLocator 대상 판정", () => {
  const locator = new TableCellLocator();

  it("헤더 행을 누르면 헤더 대상이 된다", () => {
    expect(locator.targetAt(createTable(2), 30, 55))
      .toEqual({ kind: "tableHeader", elementId: "t", columnIndex: 0 });
  });

  it("두 번째 열의 헤더를 구분한다", () => {
    expect(locator.targetAt(createTable(2), 100, 55))
      .toEqual({ kind: "tableHeader", elementId: "t", columnIndex: 1 });
  });

  it("헤더 아래 첫 줄은 첫 번째 행이 된다", () => {
    expect(locator.targetAt(createTable(2), 30, 65))
      .toEqual({ kind: "tableCell", elementId: "t", rowIndex: 0, columnIndex: 0 });
  });

  it("헤더를 숨기면 첫 줄이 바로 첫 번째 행이 된다", () => {
    expect(locator.targetAt(createTable(2, false), 30, 55))
      .toEqual({ kind: "tableCell", elementId: "t", rowIndex: 0, columnIndex: 0 });
  });

  it("저장된 행보다 아래를 누르면 편집 대상이 없다", () => {
    expect(locator.targetAt(createTable(2), 30, 95)).toBeUndefined();
  });

  it("표 왼쪽 밖을 누르면 편집 대상이 없다", () => {
    expect(locator.targetAt(createTable(2), 10, 65)).toBeUndefined();
  });

  it("열 너비 합계를 넘는 오른쪽을 누르면 편집 대상이 없다", () => {
    expect(locator.targetAt(createTable(2), 130, 65)).toBeUndefined();
  });

  it("데이터 표의 본문은 값이 데이터에서 오므로 편집 대상이 아니다", () => {
    const bound = createTable(0).withSource(new BoundTableSource(new Binding("items")));

    expect(locator.targetAt(bound, 30, 65)).toBeUndefined();
    expect(locator.targetAt(bound, 30, 55))
      .toEqual({ kind: "tableHeader", elementId: "t", columnIndex: 0 });
  });
});

describe("TableCellLocator 영역 계산", () => {
  const locator = new TableCellLocator();

  it("헤더 영역은 표 첫 줄의 해당 열을 덮는다", () => {
    const frame = locator.frameOf(createTable(2), {
      kind: "tableHeader", elementId: "t", columnIndex: 1,
    });

    expect(frame).toEqual(new Frame(80, 50, 40, 10));
  });

  it("셀 영역은 헤더 높이를 더한 위치를 덮는다", () => {
    const frame = locator.frameOf(createTable(2), {
      kind: "tableCell", elementId: "t", rowIndex: 1, columnIndex: 0,
    });

    expect(frame).toEqual(new Frame(20, 70, 60, 10));
  });

  it("누른 지점과 입력기 영역이 같은 셀을 가리킨다", () => {
    const table = createTable(3);

    const target = locator.targetAt(table, 95, 78)!;
    const frame = locator.frameOf(table, target);

    expect(frame.contains(95, 78)).toBe(true);
  });
});

describe("TableCellLocator Tab 이동", () => {
  const locator = new TableCellLocator();

  it("헤더에서 오른쪽으로 이동한다", () => {
    expect(locator.nextTarget(createTable(1), {
      kind: "tableHeader", elementId: "t", columnIndex: 0,
    }, 1)).toEqual({ kind: "tableHeader", elementId: "t", columnIndex: 1 });
  });

  it("헤더 마지막 열에서 첫 행 첫 열로 넘어간다", () => {
    expect(locator.nextTarget(createTable(1), {
      kind: "tableHeader", elementId: "t", columnIndex: 1,
    }, 1)).toEqual({ kind: "tableCell", elementId: "t", rowIndex: 0, columnIndex: 0 });
  });

  it("행 마지막 열에서 다음 행 첫 열로 넘어간다", () => {
    expect(locator.nextTarget(createTable(2), {
      kind: "tableCell", elementId: "t", rowIndex: 0, columnIndex: 1,
    }, 1)).toEqual({ kind: "tableCell", elementId: "t", rowIndex: 1, columnIndex: 0 });
  });

  it("마지막 셀에서는 더 갈 곳이 없다", () => {
    expect(locator.nextTarget(createTable(2), {
      kind: "tableCell", elementId: "t", rowIndex: 1, columnIndex: 1,
    }, 1)).toBeUndefined();
  });

  it("Shift+Tab은 반대로 이동한다", () => {
    expect(locator.nextTarget(createTable(2), {
      kind: "tableCell", elementId: "t", rowIndex: 0, columnIndex: 0,
    }, -1)).toEqual({ kind: "tableHeader", elementId: "t", columnIndex: 1 });
  });

  it("첫 대상에서 뒤로 가려 하면 더 갈 곳이 없다", () => {
    expect(locator.nextTarget(createTable(2), {
      kind: "tableHeader", elementId: "t", columnIndex: 0,
    }, -1)).toBeUndefined();
  });
});
