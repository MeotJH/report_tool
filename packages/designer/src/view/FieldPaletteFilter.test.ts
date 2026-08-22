import type { FieldSchema } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { FieldPaletteFilter } from "./FieldPaletteFilter.js";

describe("FieldPaletteFilter", () => {
  it("라벨 또는 경로가 검색어와 맞는 필드만 남긴다", () => {
    const filter = new FieldPaletteFilter();

    const byLabel = filter.filter(createFields(), "주민");
    const byPath = filter.filter(createFields(), "employee.name");

    expect(Object.keys(byLabel.employee?.children ?? {})).toEqual(["residentNumber"]);
    expect(Object.keys(byPath.employee?.children ?? {})).toEqual(["name"]);
  });

  it("검색어가 비어 있으면 전체 스키마를 유지한다", () => {
    const fields = createFields();

    expect(new FieldPaletteFilter().filter(fields, "  ")).toBe(fields);
  });

  it("그룹 라벨이 일치하면 그 아래 필드를 모두 보여준다", () => {
    const filtered = new FieldPaletteFilter().filter(createFields(), "직원 정보");

    expect(Object.keys(filtered.employee?.children ?? {}))
      .toEqual(["name", "residentNumber"]);
  });
});

/** 검색 테스트가 중첩 경로와 민감 필드를 함께 검증할 스키마를 만든다. */
function createFields(): FieldSchema {
  return {
    employee: {
      label: "직원 정보",
      type: "array",
      children: {
        name: { label: "이름", type: "string" },
        residentNumber: { label: "주민등록번호", type: "string", sensitive: true },
      },
    },
    payroll: { label: "급여", type: "currency" },
  };
}
