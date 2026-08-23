import { describe, expect, it } from "vitest";
import type { PaletteEntry } from "../controller/PaletteEntry.js";
import { FieldPaletteFilter } from "./FieldPaletteFilter.js";

/** 검색 검증에 쓸 항목을 짧게 만든다. */
function entry(
  path: string,
  label: string,
  overrides: Partial<PaletteEntry> = {},
): PaletteEntry {
  return {
    path,
    label,
    type: "string",
    origin: "host",
    sensitive: false,
    children: [],
    arrayPath: null,
    ...overrides,
  };
}

const entries: readonly PaletteEntry[] = [
  entry("employee.name", "이름"),
  entry("pay.net", "실지급액", { type: "currency" }),
  entry("payItems", "지급 항목", {
    type: "array",
    children: [
      entry("payItems.item", "항목", { arrayPath: "payItems" }),
      entry("payItems.amount", "금액", { type: "currency", arrayPath: "payItems" }),
    ],
  }),
];

describe("FieldPaletteFilter", () => {
  const filter = new FieldPaletteFilter();

  it("검색어가 없으면 전체 목록을 그대로 준다", () => {
    expect(filter.filter(entries, "  ")).toBe(entries);
  });

  it("표시 이름으로 찾는다", () => {
    const found = filter.filter(entries, "실지급");

    expect(found.map((item) => item.path)).toEqual(["pay.net"]);
  });

  it("전체 경로로 찾는다", () => {
    const found = filter.filter(entries, "employee.");

    expect(found.map((item) => item.path)).toEqual(["employee.name"]);
  });

  it("타입으로 찾는다", () => {
    const found = filter.filter(entries, "currency");

    expect(found.map((item) => item.path)).toEqual(["pay.net", "payItems"]);
  });

  it("자식이 일치하면 부모 배열을 남겨 문맥을 유지한다", () => {
    const found = filter.filter(entries, "금액");

    expect(found).toHaveLength(1);
    expect(found[0]?.path).toBe("payItems");
    expect(found[0]?.children.map((child) => child.path)).toEqual(["payItems.amount"]);
  });

  it("배열 자체가 일치하면 자식을 모두 유지한다", () => {
    const found = filter.filter(entries, "지급 항목");

    expect(found[0]?.children).toHaveLength(2);
  });

  it("일치가 없으면 빈 목록을 준다", () => {
    expect(filter.filter(entries, "없는이름")).toEqual([]);
  });

  it("배열과 자식을 모두 세어 실제로 놓을 수 있는 항목 수를 알린다", () => {
    expect(filter.countFields(entries)).toBe(5);
  });
});
