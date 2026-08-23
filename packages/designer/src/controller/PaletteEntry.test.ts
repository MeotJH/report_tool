import { TemplateVariable } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { PaletteEntryBuilder } from "./PaletteEntry.js";

describe("PaletteEntryBuilder", () => {
  const builder = new PaletteEntryBuilder();

  it("선언한 변수를 경로와 표시 정보가 붙은 목록으로 바꾼다", () => {
    const entries = builder.build([
      new TemplateVariable("pay.bonus", "상여금", "currency", true),
    ]);

    expect(entries.map((entry) => entry.path)).toEqual(["pay.bonus"]);
    expect(entries[0]?.label).toBe("상여금");
    expect(entries[0]?.type).toBe("currency");
  });

  it("점 경로로 선언한 자식을 배열 아래에 붙인다", () => {
    const entries = builder.build([
      new TemplateVariable("deductionItems", "공제 항목", "array"),
      new TemplateVariable("deductionItems.item", "항목", "string"),
      new TemplateVariable("deductionItems.amount", "금액", "currency"),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.children.map((child) => child.path))
      .toEqual(["deductionItems.item", "deductionItems.amount"]);
  });

  it("자식 항목이 소속 배열 경로를 기억한다", () => {
    const [employee] = builder.build([
      new TemplateVariable("employee", "직원 정보", "array"),
      new TemplateVariable("employee.name", "이름", "string"),
    ]);

    expect(employee?.children[0]?.arrayPath).toBe("employee");
  });

  it("선언 순서가 뒤섞여도 부모를 먼저 붙여 자식이 밀려나지 않는다", () => {
    const entries = builder.build([
      new TemplateVariable("rows.item", "항목", "string"),
      new TemplateVariable("rows", "행", "array"),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.children.map((child) => child.path)).toEqual(["rows.item"]);
  });

  it("부모가 없는 점 경로 선언은 버리지 않고 최상위에 둔다", () => {
    const entries = builder.build([
      new TemplateVariable("pay.bonus", "상여금", "currency"),
    ]);

    expect(entries.map((entry) => entry.path)).toEqual(["pay.bonus"]);
  });

  it("같은 경로를 두 번 선언해도 목록에는 한 번만 나온다", () => {
    const entries = builder.build([
      new TemplateVariable("baseSalary", "기본급", "currency"),
      new TemplateVariable("baseSalary", "다른 이름", "currency"),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("기본급");
  });
});
