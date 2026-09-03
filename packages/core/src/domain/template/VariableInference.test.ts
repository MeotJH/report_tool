import { describe, expect, it } from "vitest";
import { VariableInference } from "./VariableInference.js";

/** 선언 목록을 `경로:종류` 문자열로 줄여 읽기 쉽게 비교한다. */
function shapeOf(sample: unknown): readonly string[] {
  return new VariableInference().infer(sample).map((v) => `${v.name}:${v.type}`);
}

describe("VariableInference", () => {
  it("중첩 객체를 점 경로로 편다", () => {
    expect(shapeOf({ customer: { shortName: "인팩" } })).toEqual([
      "customer.shortName:string",
    ]);
  });

  it("배열은 자기 자신과 한 줄의 구성을 함께 선언한다", () => {
    expect(shapeOf({ others: [{ kind: "안내", title: "제목" }] })).toEqual([
      "others:array",
      "others.kind:string",
      "others.title:string",
    ]);
  });

  it("자식 순서는 데이터에 나온 순서를 지킨다", () => {
    const sample = { rows: [{ no: 1, name: "가", hours: 0.5 }] };
    expect(shapeOf(sample)).toEqual([
      "rows:array",
      "rows.no:number",
      "rows.name:string",
      "rows.hours:number",
    ]);
  });

  it("첫 행에 없던 키도 뒤 행에서 찾아 낸다", () => {
    const sample = { rows: [{ a: 1 }, { a: 2, b: "늦게 나온 열" }] };
    expect(shapeOf(sample)).toEqual(["rows:array", "rows.a:number", "rows.b:string"]);
  });

  it("첫 행이 비어 있어도 뒤 행의 값으로 종류를 정한다", () => {
    const sample = { rows: [{ score: "" }, { score: 4.5 }] };
    expect(shapeOf(sample)).toEqual(["rows:array", "rows.score:number"]);
  });

  it("끝까지 비어 있는 칸은 문자로 둔다", () => {
    expect(shapeOf({ rows: [{ note: "" }] })).toEqual(["rows:array", "rows.note:string"]);
  });

  it("빈 배열도 선언은 남긴다 — 표를 연결할 대상이 필요하다", () => {
    expect(shapeOf({ unresolved: [] })).toEqual(["unresolved:array"]);
  });

  it("표시 이름은 경로의 마지막 구간을 그대로 쓴다", () => {
    const declared = new VariableInference().infer({ period: { start: "2026.07.01" } });
    expect(declared[0]?.label).toBe("start");
  });

  it("금액과 날짜를 짐작하지 않는다", () => {
    const sample = { pay: 4200000, when: "2026-07-01" };
    expect(shapeOf(sample)).toEqual(["pay:number", "when:string"]);
  });

  it("객체가 아닌 샘플에서는 아무것도 선언하지 않는다", () => {
    expect(shapeOf(null)).toEqual([]);
    expect(shapeOf([1, 2, 3])).toEqual([]);
  });

  it("월간 리포트 샘플에서 다섯 배열을 모두 찾아 낸다", () => {
    const sample = {
      customer: { shortName: "인팩" },
      workStats: [{ upper: "OPTI-HR", lower: "HRI" }],
      typeStats: [{ type: "[e-HR] 데이터 전달 및 수정" }],
      tickets: [{ no: 23 }],
      unresolved: [],
      others: [],
    };
    const arrays = new VariableInference().infer(sample)
      .filter((v) => v.type === "array")
      .map((v) => v.name);
    expect(arrays).toEqual(["workStats", "typeStats", "tickets", "unresolved", "others"]);
  });
});
