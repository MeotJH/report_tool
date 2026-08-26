import { describe, expect, it } from "vitest";
import { TableHeaderCells } from "./TableHeaderCells.js";

describe("TableHeaderCells", () => {
  it("같은 지정을 중복이나 순서와 무관하게 하나의 값으로 만든다", () => {
    const cells = new TableHeaderCells([2, 0, 2], [1, 1]);

    expect(cells.columns).toEqual([0, 2]);
    expect(cells.rows).toEqual([1]);
    expect(cells.toJSON()).toEqual({ columns: [0, 2], rows: [1] });
  });

  it("지정을 켜고 끄면서 원본 값을 바꾸지 않는다", () => {
    const cells = new TableHeaderCells([0]);

    expect(cells.toggleColumn(1).columns).toEqual([0, 1]);
    expect(cells.toggleColumn(0).columns).toEqual([]);
    expect(cells.columns).toEqual([0]);
  });

  it("앞에 열이 끼어들면 지정이 같은 열을 계속 가리킨다", () => {
    const cells = new TableHeaderCells([1]);

    expect(cells.withColumnInserted(0).columns).toEqual([2]);
    expect(cells.withColumnInserted(2).columns).toEqual([1]);
  });

  it("지정된 열이 삭제되면 지정을 버리고 뒤의 지정을 당긴다", () => {
    const cells = new TableHeaderCells([0, 2]);

    expect(cells.withColumnRemoved(0).columns).toEqual([1]);
    expect(cells.withColumnRemoved(1).columns).toEqual([0, 1]);
  });

  it("행 삽입과 삭제도 열과 같은 규칙으로 지정을 옮긴다", () => {
    const cells = new TableHeaderCells([], [1]);

    expect(cells.withRowInserted(0).rows).toEqual([2]);
    expect(cells.withRowRemoved(1).rows).toEqual([]);
  });

  it("열이 줄면 없는 열을 가리키는 지정이 남지 않는다", () => {
    const cells = new TableHeaderCells([0, 3]);

    expect(cells.clampedToColumns(2).columns).toEqual([0]);
  });

  it("머리글 개념 이전에 저장된 표는 지정 없음으로 복원된다", () => {
    expect(TableHeaderCells.fromJSON(undefined).columns).toEqual([]);
    expect(TableHeaderCells.fromJSON({ columns: [0, -1, 1.5, "x"] }).columns).toEqual([0]);
  });
});
