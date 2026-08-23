import {
  ConstantVariable,
  DataVariable,
  type FieldSchema,
} from "@report-tool/core";
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

  it("사용자가 선언한 데이터 변수를 선언 출처로 덧붙인다", () => {
    const entries = builder.build(hostFields, [
      new DataVariable("pay.bonus", "상여금", "currency", true),
    ]);

    const bonus = entries.find((entry) => entry.path === "pay.bonus");
    expect(bonus?.origin).toBe("declared");
    expect(bonus?.label).toBe("상여금");
    expect(bonus?.type).toBe("currency");
  });

  it("선언한 배열의 자식도 함께 펼친다", () => {
    const entries = builder.build({}, [
      new DataVariable("deductionItems", "공제 항목", "array", false, [
        new DataVariable("item", "항목", "string"),
        new DataVariable("amount", "금액", "currency"),
      ]),
    ]);

    expect(entries[0]?.children.map((child) => child.path))
      .toEqual(["deductionItems.item", "deductionItems.amount"]);
    expect(entries[0]?.children[0]?.arrayPath).toBe("deductionItems");
  });

  it("호스트가 이미 제공하는 경로는 선언을 중복 표시하지 않는다", () => {
    const entries = builder.build(hostFields, [
      new DataVariable("baseSalary", "다른 이름", "currency"),
    ]);

    const matches = entries.filter((entry) => entry.path === "baseSalary");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.origin).toBe("host");
    expect(matches[0]?.label).toBe("기본급");
  });

  it("상수는 예약 이름공간 경로와 현재 값을 함께 보여준다", () => {
    const entries = builder.build({}, [new ConstantVariable("회사명", "아이에스유")]);

    expect(entries[0]).toMatchObject({
      path: "const.회사명",
      label: "회사명",
      origin: "constant",
      value: "아이에스유",
    });
  });

  it("호스트 필드, 선언 필드, 상수 순서로 보여준다", () => {
    const entries = builder.build(hostFields, [
      new ConstantVariable("회사명", "아이에스유"),
      new DataVariable("pay.bonus", "상여금", "currency"),
    ]);

    expect(entries.map((entry) => entry.origin))
      .toEqual(["host", "host", "declared", "constant"]);
  });
});
