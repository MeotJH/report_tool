import { describe, expect, it } from "vitest";
import { Binding } from "../value/Binding.js";
import { BoundTableSource, StaticTableSource } from "./TableSource.js";

describe("TableSource", () => {
  it("정적 표는 템플릿에 저장한 행을 외부 데이터와 무관하게 제공한다", () => {
    const originalRows = [{ item: "식대", amount: 100000 }];
    const source = new StaticTableSource(originalRows);

    originalRows[0]!.item = "변경";

    expect(source.resolveRows({ items: [] })).toEqual([
      { item: "식대", amount: 100000 },
    ]);
    expect(source.toJSON()).toEqual({
      kind: "static",
      rows: [{ item: "식대", amount: 100000 }],
    });
  });

  it("데이터 표는 Binding이 가리키는 배열만 반복 행으로 제공한다", () => {
    const source = new BoundTableSource(new Binding("pay.items"));
    const rows = [{ item: "기본급", amount: 3000000 }];

    expect(source.resolveRows({ pay: { items: rows } })).toEqual(rows);
    expect(source.resolveRows({ pay: { items: "배열 아님" } })).toEqual([]);
    expect(source.toJSON()).toEqual({
      kind: "bound",
      binding: {
        path: "pay.items", formatSpec: null, fallback: null, required: false,
      },
    });
  });
});
