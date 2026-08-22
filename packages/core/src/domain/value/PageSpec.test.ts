import { describe, expect, it } from "vitest";
import { Frame } from "./Frame";
import { PageSpec } from "./PageSpec";

describe("PageSpec", () => {
  it("세로 A4 용지 크기를 밀리미터로 반환한다", () => {
    const page = new PageSpec("A4", "portrait", [15, 15, 15, 15]);

    expect(page.widthMm()).toBe(210);
    expect(page.heightMm()).toBe(297);
  });

  it("가로 방향이면 용지의 너비와 높이를 바꾼다", () => {
    const page = new PageSpec("A4", "landscape", [15, 15, 15, 15]);

    expect(page.widthMm()).toBe(297);
    expect(page.heightMm()).toBe(210);
  });

  it("여백을 제외한 실제 배치 영역을 계산한다", () => {
    const page = new PageSpec("A4", "portrait", [15, 15, 15, 15]);

    expect(page.contentFrame().equals(new Frame(15, 15, 180, 267))).toBe(true);
  });
});
