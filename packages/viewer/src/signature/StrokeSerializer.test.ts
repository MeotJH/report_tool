import type { SignatureStroke } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { StrokeSerializer } from "./StrokeSerializer.js";

describe("StrokeSerializer", () => {
  it("왕복해도 그린 그대로 남는다", () => {
    const strokes: readonly SignatureStroke[] = [
      { points: [[10, 20], [11, 21], [12, 22]] },
      { points: [[30, 40]] },
    ];

    const restored = StrokeSerializer.fromJSON(StrokeSerializer.toJSON(strokes));

    expect(restored).toEqual(strokes);
  });

  it("필압까지 함께 남는다", () => {
    const strokes: readonly SignatureStroke[] = [{ points: [[10, 20, 0.5]] }];

    const restored = StrokeSerializer.fromJSON(StrokeSerializer.toJSON(strokes));

    expect(restored[0]?.points[0]).toEqual([10, 20, 0.5]);
  });

  it("점이 하나도 없는 획은 받지 않는다", () => {
    expect(() => StrokeSerializer.toJSON([{ points: [] }]))
      .toThrow("점이 없는 획은 서명이 아니다");
  });

  it("깨진 JSON이면 무엇이 잘못됐는지 알린다", () => {
    expect(() => StrokeSerializer.fromJSON("{"))
      .toThrow("서명을 읽을 수 없다");
  });

  it("획 목록이 아닌 것은 거절한다", () => {
    expect(() => StrokeSerializer.fromJSON('{"points":[[1,2]]}'))
      .toThrow("서명은 획 목록이어야 한다");
  });

  it("좌표가 숫자가 아니면 거절한다", () => {
    expect(() => StrokeSerializer.fromJSON('[{"points":[["a","b"]]}]'))
      .toThrow("좌표는 숫자여야 한다");
  });

  it("좌표 개수가 둘이나 셋이 아니면 거절한다", () => {
    expect(() => StrokeSerializer.fromJSON('[{"points":[[1]]}]'))
      .toThrow("좌표는 x·y와 선택적 필압으로 이루어진다");
  });

  it("빈 서명은 빈 목록으로 왕복한다", () => {
    expect(StrokeSerializer.fromJSON(StrokeSerializer.toJSON([]))).toEqual([]);
  });
});
