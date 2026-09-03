import { describe, expect, it } from "vitest";
import { ImagePlacement } from "./ImagePlacement.js";

describe("ImagePlacement", () => {
  const natural = { width: 200, height: 100 };
  const available = { width: 100, height: 100 };

  it("영역에 맞춤은 비율을 버리고 자리를 다 채운다", () => {
    const placed = ImagePlacement.of("stretch").place(natural, available);

    expect(placed).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it("비율 유지(안쪽)는 자리 안에 온전히 들어간다", () => {
    const placed = ImagePlacement.of("contain").place(natural, available);

    expect(placed.width).toBe(100);
    expect(placed.height).toBe(50);
  });

  it("비율 유지(채움)는 자리를 남김없이 덮는다", () => {
    const placed = ImagePlacement.of("cover").place(natural, available);

    expect(placed.width).toBe(200);
    expect(placed.height).toBe(100);
  });

  it("남거나 넘치는 만큼을 좌우·위아래로 똑같이 나눈다", () => {
    const placed = ImagePlacement.of("contain").place(natural, available);

    expect(placed).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });

  it("덮을 때 넘치는 만큼은 음수로 밀려 가운데가 맞는다", () => {
    const placed = ImagePlacement.of("cover").place(natural, available);

    expect(placed.x).toBe(-50);
    expect(placed.y).toBe(0);
  });

  it("크기를 알 수 없는 그림은 자리를 그대로 쓴다", () => {
    const placed = ImagePlacement.of("contain").place({ width: 0, height: 0 }, available);

    expect(placed).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});
