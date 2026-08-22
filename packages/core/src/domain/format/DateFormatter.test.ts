import { describe, expect, it } from "vitest";
import { DateFormatter } from "./DateFormatter";

describe("DateFormatter", () => {
  it("ISO 날짜를 숫자 패턴으로 표시한다", () => {
    const formatter = new DateFormatter("YYYY-MM-DD");

    expect(formatter.format("2026-08-25T00:00:00Z")).toBe("2026-08-25");
  });

  it("ISO 날짜를 한글 패턴으로 표시한다", () => {
    const formatter = new DateFormatter("YYYY년 MM월 DD일");

    expect(formatter.format("2026-08-25")).toBe("2026년 08월 25일");
  });

  it("유효하지 않은 날짜 문자열은 빈 문자열로 처리한다", () => {
    expect(new DateFormatter("YYYY-MM-DD").format("invalid")).toBe("");
  });

  it("문자열이 아닌 값은 빈 문자열로 처리한다", () => {
    expect(new DateFormatter("YYYY-MM-DD").format(20260825)).toBe("");
  });
});
