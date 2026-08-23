import { describe, expect, it } from "vitest";
import { TableColumn } from "./TableColumn.js";
import { TableCellResolver } from "./TableCellResolver.js";

/** 행에서 값을 꺼내는 평범한 열을 짧게 만든다. */
function column(key: string): TableColumn {
  return new TableColumn(key, key, `{{row.${key}}}`, 30, "left", null);
}

describe("TableCellResolver", () => {
  const resolver = new TableCellResolver();

  it("데이터 표의 행에서 값을 꺼낸다", () => {
    const value = resolver.resolve(column("amount"), { amount: 4200000 }, {});

    expect(value).toBe("4200000");
  });

  it("정적 셀에 적은 표현식을 문서 데이터로 채운다", () => {
    const value = resolver.resolve(
      column("amount"),
      { amount: "{{baseSalary}}" },
      { baseSalary: 4200000 },
    );

    expect(value).toBe("4200000");
  });

  it("고정 문구 셀은 그대로 둔다", () => {
    const value = resolver.resolve(column("item"), { item: "기본급" }, { item: "다른값" });

    expect(value).toBe("기본급");
  });

  it("한 행에서 고정 항목명과 변수 금액을 함께 만든다", () => {
    const columns = [column("item"), column("amount")];

    const cells = resolver.resolveRow(
      columns,
      { item: "기본급", amount: "{{pay.base}}" },
      { pay: { base: 3000000 } },
    );

    expect(cells).toEqual(["기본급", "3000000"]);
  });

  it("데이터에 없는 경로는 빈칸으로 둔다", () => {
    const value = resolver.resolve(column("amount"), { amount: "{{없는값}}" }, {});

    expect(value).toBe("");
  });

  it("치환은 두 번까지만 하고 더 파고들지 않는다", () => {
    const value = resolver.resolve(
      column("amount"),
      { amount: "{{first}}" },
      { first: "{{second}}", second: "끝" },
    );

    expect(value).toBe("{{second}}");
  });

  it("설계 화면용 해석은 표현식을 값으로 바꾸지 않는다", () => {
    const cells = resolver.resolveRowSource(
      [column("item"), column("amount")],
      { item: "기본급", amount: "{{pay.base}}" },
    );

    expect(cells).toEqual(["기본급", "{{pay.base}}"]);
  });

  it("빈 셀은 빈 문자열이 된다", () => {
    expect(resolver.resolve(column("amount"), {}, {})).toBe("");
  });
});
