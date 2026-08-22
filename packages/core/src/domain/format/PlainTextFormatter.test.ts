import { describe, expect, it } from "vitest";
import { PlainTextFormatter } from "./PlainTextFormatter";

describe("PlainTextFormatter", () => {
  it("값을 별도 변환 없이 문자열로 표시한다", () => {
    expect(new PlainTextFormatter().format(42)).toBe("42");
  });

  it("값이 없으면 빈 문자열로 처리한다", () => {
    const formatter = new PlainTextFormatter();

    expect(formatter.format(null)).toBe("");
    expect(formatter.format(undefined)).toBe("");
  });
});
