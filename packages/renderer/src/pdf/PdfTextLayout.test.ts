import { describe, expect, it } from "vitest";
import { TextStyle } from "@report-tool/core";
import { PdfTextLayout } from "./PdfTextLayout";

const measureWidth = (text: string, size: number): number => text.length * size * 0.5;

describe("PdfTextLayout", () => {
  it("폭이 넉넉하면 원문과 글자 크기를 그대로 유지한다", () => {
    const style = createStyle("wrap");

    const result = new PdfTextLayout().layout("급여 명세서", style, 100, measureWidth);

    expect(result).toEqual({ lines: ["급여 명세서"], fontSize: 10 });
  });

  it("wrap 정책은 좁은 폭에서 공백을 기준으로 여러 줄을 만든다", () => {
    const style = createStyle("wrap");

    const result = new PdfTextLayout().layout(
      "기본급 직책수당 식대",
      style,
      18,
      measureWidth,
    );

    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    expect(result.fontSize).toBe(10);
  });

  it("shrink 정책은 한 줄을 유지하면서 글자 크기를 줄인다", () => {
    const style = createStyle("shrink");

    const result = new PdfTextLayout().layout(
      "아주 긴 급여명세서 제목",
      style,
      18,
      measureWidth,
    );

    expect(result.lines).toEqual(["아주 긴 급여명세서 제목"]);
    expect(result.fontSize).toBeLessThan(10);
    expect(result.fontSize).toBeGreaterThanOrEqual(6);
  });

  it("truncate 정책은 좁은 폭에서 끝을 생략 부호로 바꾼다", () => {
    const style = createStyle("truncate");

    const result = new PdfTextLayout().layout(
      "아주 긴 급여명세서 제목",
      style,
      18,
      measureWidth,
    );

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatch(/…$/);
  });
});

/** 오버플로 정책만 달라지는 동일한 텍스트 스타일을 만든다. */
function createStyle(overflow: "wrap" | "shrink" | "truncate"): TextStyle {
  return new TextStyle("Pretendard", 10, { overflow });
}
