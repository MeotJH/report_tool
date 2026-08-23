import { describe, expect, it } from "vitest";
import { TextStyle } from "../value/TextStyle.js";
import { TextLayout } from "./TextLayout.js";

const measureWidth = (text: string, size: number): number => text.length * size * 0.5;

/** 오버플로 정책만 달라지는 동일한 텍스트 스타일을 만든다. */
function createStyle(overflow: "wrap" | "shrink" | "truncate"): TextStyle {
  return new TextStyle("Pretendard", 10, { overflow });
}

describe("TextLayout", () => {
  const layout = new TextLayout();

  it("폭이 넉넉하면 원문과 글자 크기를 그대로 유지한다", () => {
    const result = layout.layout("급여 명세서", createStyle("wrap"), 100, measureWidth);

    expect(result).toEqual({ lines: ["급여 명세서"], fontSize: 10 });
  });

  it("wrap 정책은 좁은 폭에서 공백을 기준으로 여러 줄을 만든다", () => {
    const result = layout.layout("기본급 직책수당 식대", createStyle("wrap"), 18, measureWidth);

    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    expect(result.fontSize).toBe(10);
  });

  it("shrink 정책은 한 줄을 유지하면서 글자 크기를 줄인다", () => {
    const result = layout.layout("아주 긴 급여명세서 제목", createStyle("shrink"), 18, measureWidth);

    expect(result.lines).toEqual(["아주 긴 급여명세서 제목"]);
    expect(result.fontSize).toBeLessThan(10);
    expect(result.fontSize).toBeGreaterThanOrEqual(6);
  });

  it("truncate 정책은 좁은 폭에서 끝을 생략 부호로 바꾼다", () => {
    const result = layout.layout("아주 긴 급여명세서 제목", createStyle("truncate"), 18, measureWidth);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatch(/…$/);
  });

  it("사용자가 넣은 줄바꿈을 문단 경계로 지킨다", () => {
    const result = layout.layout(
      "1. 기술 자료\n2. 영업 자료\n3. 인사 자료",
      createStyle("wrap"),
      100,
      measureWidth,
    );

    expect(result.lines).toEqual(["1. 기술 자료", "2. 영업 자료", "3. 인사 자료"]);
  });

  it("배치 결과의 어떤 줄에도 줄바꿈 문자가 남지 않는다", () => {
    const result = layout.layout(
      "본 서약서에서 비밀정보라 함은 다음 각 호를 말한다\n1. 제품의 설계도와 소스코드\n2. 고객 명단과 거래 조건",
      createStyle("wrap"),
      20,
      measureWidth,
    );

    expect(result.lines.every((line) => !line.includes("\n"))).toBe(true);
  });

  it("긴 문단은 줄바꿈으로 나뉜 뒤에도 각자 접혀 순서를 지킨다", () => {
    const result = layout.layout("가나다 라마바\n사아자 차카타", createStyle("wrap"), 8, measureWidth);

    expect(result.lines).toEqual(["가나다", "라마바", "사아자", "차카타"]);
  });

  it("빈 문단을 빈 줄로 보존해 문단 사이 간격이 사라지지 않게 한다", () => {
    const result = layout.layout("첫 문단\n\n다음 문단", createStyle("wrap"), 100, measureWidth);

    expect(result.lines).toEqual(["첫 문단", "", "다음 문단"]);
  });

  it("문단마다 축소 배율이 다르면 가장 작은 크기로 통일한다", () => {
    const result = layout.layout("짧다\n아주 긴 급여명세서 제목", createStyle("shrink"), 18, measureWidth);

    expect(result.lines).toHaveLength(2);
    expect(result.fontSize).toBeLessThan(10);
  });

  it("배치된 줄이 차지하는 세로 길이를 mm로 알려 준다", () => {
    const style = new TextStyle("Pretendard", 10, { lineHeight: 1.5 });
    const result = { lines: ["가", "나", "다"], fontSize: 10 };

    expect(layout.heightMm(result, style)).toBeCloseTo(45 / (72 / 25.4), 5);
  });
});
