import { describe, expect, it } from "vitest";
import { TableCellValueParser } from "./TableCellValueParser.js";

describe("TableCellValueParser", () => {
  const parser = new TableCellValueParser();

  it("금액 정렬과 포맷이 동작하도록 숫자 입력은 숫자로 저장한다", () => {
    expect(parser.parse("189000")).toBe(189000);
    expect(parser.parse(" 4200000 ")).toBe(4200000);
    expect(parser.parse("-1500")).toBe(-1500);
    expect(parser.parse("12.5")).toBe(12.5);
  });

  it("사용자가 보이길 원한 모양이 바뀌는 입력은 문자열로 남긴다", () => {
    expect(parser.parse("007")).toBe("007");
    expect(parser.parse("1,000")).toBe("1,000");
    expect(parser.parse("1500원")).toBe("1500원");
    expect(parser.parse("2026-08")).toBe("2026-08");
  });

  it("빈 입력은 빈 셀로 저장한다", () => {
    expect(parser.parse("")).toBe("");
    expect(parser.parse("   ")).toBe("");
  });

  it("저장된 값을 입력기가 다룰 문자열로 되돌린다", () => {
    expect(parser.format(189000)).toBe("189000");
    expect(parser.format("국민연금")).toBe("국민연금");
    expect(parser.format(null)).toBe("");
    expect(parser.format(undefined)).toBe("");
  });
});
