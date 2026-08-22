import { describe, expect, it } from "vitest";
import { Frame } from "./Frame";

describe("Frame", () => {
  it("기존 위치를 변경하지 않고 이동한 영역을 반환한다", () => {
    const original = new Frame(0, 0, 10, 10);

    const moved = original.moveBy(5, 5);

    expect(moved.equals(new Frame(5, 5, 10, 10))).toBe(true);
    expect(original.equals(new Frame(0, 0, 10, 10))).toBe(true);
  });

  it("좌표가 영역 안에 포함되는지 판단한다", () => {
    const frame = new Frame(0, 0, 10, 10);

    expect(frame.contains(5, 5)).toBe(true);
    expect(frame.contains(20, 20)).toBe(false);
  });

  it("페이지 좌상단 기준 좌표를 PDF 좌하단 기준 좌표로 변환한다", () => {
    const frame = new Frame(20, 35, 60, 8);

    const pdfRectangle = frame.toPdfRect(297);

    expect(pdfRectangle.y).toBeCloseTo((297 - 35 - 8) * 2.834645669291339);
  });

  it("위치를 유지하고 크기만 변경한다", () => {
    const frame = new Frame(20, 35, 60, 8);

    const resized = frame.resizeTo(100, 20);

    expect(resized.equals(new Frame(20, 35, 100, 20))).toBe(true);
  });

  it("음수 크기를 허용하지 않는다", () => {
    expect(() => new Frame(0, 0, -1, 10)).toThrow(
      "Frame 크기는 음수가 될 수 없다",
    );
  });

  it("기존 객체를 변경하지 않고 지정한 위치로 이동한다", () => {
    const frame = new Frame(10, 20, 30, 40);

    const movedFrame = frame.moveTo(50, 60);

    expect(movedFrame.equals(new Frame(50, 60, 30, 40))).toBe(true);
    expect(frame.equals(new Frame(10, 20, 30, 40))).toBe(true);
  });
});
