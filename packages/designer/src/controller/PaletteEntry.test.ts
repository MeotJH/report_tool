import { TemplateVariable, type FieldSchema } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { PaletteEntryBuilder } from "./PaletteEntry.js";

const hostFields: FieldSchema = {
  employee: {
    label: "직원 정보",
    type: "array",
    children: {
      name: { label: "이름", type: "string" },
      residentNumber: { label: "주민등록번호", type: "string", sensitive: true },
    },
  },
  baseSalary: { label: "기본급", type: "currency" },
};

describe("PaletteEntryBuilder", () => {
  const builder = new PaletteEntryBuilder();

  it("호스트 스키마를 경로와 출처가 붙은 목록으로 바꾼다", () => {
    const entries = builder.build(hostFields, []);

    expect(entries.map((entry) => entry.path)).toEqual(["employee", "baseSalary"]);
    expect(entries.every((entry) => entry.origin === "host")).toBe(true);
  });

  it("자식 항목이 소속 배열 경로를 기억한다", () => {
    const [employee] = builder.build(hostFields, []);

    expect(employee?.children.map((child) => child.path))
      .toEqual(["employee.name", "employee.residentNumber"]);
    expect(employee?.children.every((child) => child.arrayPath === "employee")).toBe(true);
  });

  it("민감 필드 표시를 유지한다", () => {
    const [employee] = builder.build(hostFields, []);

    expect(employee?.children[1]?.sensitive).toBe(true);
  });

  it("사용자가 선언한 데이터 변수를 선언 출처로 표시한다", () => {
    const entries = builder.build(hostFields, [
      new TemplateVariable("pay.bonus", "상여금", "currency", true),
    ]);

    const bonus = entries.find((entry) => entry.path === "pay.bonus");
    expect(bonus?.origin).toBe("declared");
    expect(bonus?.label).toBe("상여금");
    expect(bonus?.type).toBe("currency");
  });

  it("점 경로로 선언한 자식을 배열 아래에 붙인다", () => {
    const entries = builder.build({}, [
      new TemplateVariable("deductionItems", "공제 항목", "array"),
      new TemplateVariable("deductionItems.item", "항목", "string"),
      new TemplateVariable("deductionItems.amount", "금액", "currency"),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.children.map((child) => child.path))
      .toEqual(["deductionItems.item", "deductionItems.amount"]);
    expect(entries[0]?.children[0]?.arrayPath).toBe("deductionItems");
  });

  it("호스트 배열에 없는 필드를 선언하면 그 배열 아래에 붙인다", () => {
    const entries = builder.build(hostFields, [
      new TemplateVariable("employee.phone", "전화번호", "string"),
    ]);

    const employee = entries.find((entry) => entry.path === "employee");
    expect(employee?.children.map((child) => child.path)).toEqual([
      "employee.name", "employee.residentNumber", "employee.phone",
    ]);
    expect(employee?.children[2]?.origin).toBe("declared");
    expect(employee?.children[2]?.arrayPath).toBe("employee");
  });

  it("선언 순서가 뒤섞여도 부모를 먼저 붙여 자식이 밀려나지 않는다", () => {
    const entries = builder.build({}, [
      new TemplateVariable("rows.item", "항목", "string"),
      new TemplateVariable("rows", "행", "array"),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.children.map((child) => child.path)).toEqual(["rows.item"]);
  });

  it("부모가 없는 점 경로 선언은 버리지 않고 최상위에 둔다", () => {
    const entries = builder.build({}, [
      new TemplateVariable("pay.bonus", "상여금", "currency"),
    ]);

    expect(entries.map((entry) => entry.path)).toEqual(["pay.bonus"]);
  });

  it("호스트가 이미 제공하는 경로는 선언을 중복 표시하지 않는다", () => {
    const entries = builder.build(hostFields, [
      new TemplateVariable("baseSalary", "다른 이름", "currency"),
    ]);

    const matches = entries.filter((entry) => entry.path === "baseSalary");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.origin).toBe("host");
    expect(matches[0]?.label).toBe("기본급");
  });

  it("호스트 필드 뒤에 선언 필드를 이어 보여준다", () => {
    const entries = builder.build(hostFields, [
      new TemplateVariable("pay.bonus", "상여금", "currency"),
    ]);

    expect(entries.map((entry) => entry.origin))
      .toEqual(["host", "host", "declared"]);
  });
});
