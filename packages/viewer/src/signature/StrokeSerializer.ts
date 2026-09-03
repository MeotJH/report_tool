import type { SignatureStroke } from "@report-tool/core";

/** 서명 한 점이다. x·y와, 기기가 주면 필압까지. */
type SignaturePoint = readonly [number, number, number?];

/**
 * 서명 획을 서버로 보낼 문자열과 다시 그릴 배열 사이에서 옮긴다.
 *
 * 양방향이 필요해서 따로 둔다. 보낼 때만 생각하면 `JSON.stringify` 한 줄이지만,
 * **되살릴 때가 진짜 문제다.** 서명은 몇 년 뒤에 "이 사람이 무엇에 서명했는가"를
 * 다시 그려 보여야 하는 자료다. 그때 들어오는 문자열은 우리가 방금 만든 것이
 * 아니라 저장소에서 나온 것이고, 형식이 조금이라도 어긋나면 아무 말 없이 빈
 * 서명이 그려진다.
 *
 * 그래서 읽을 때 형식을 하나씩 확인하고, 어긋나면 무엇이 어긋났는지 말한다.
 */
export class StrokeSerializer {
  /** 서버로 보낼 문자열을 만든다. 보내기 전에 형식을 확인한다. */
  static toJSON(strokes: readonly SignatureStroke[]): string {
    for (const stroke of strokes) StrokeSerializer.assertStroke(stroke);
    return JSON.stringify(strokes);
  }

  /** 저장해 둔 문자열을 다시 그릴 수 있는 획으로 되돌린다. */
  static fromJSON(json: string): readonly SignatureStroke[] {
    const parsed = StrokeSerializer.parse(json);
    if (!Array.isArray(parsed)) throw new Error("서명은 획 목록이어야 한다");
    return parsed.map((stroke) => StrokeSerializer.toStroke(stroke));
  }

  /** 깨진 문자열을 만났다는 사실을 그대로 알린다. */
  private static parse(json: string): unknown {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error("서명을 읽을 수 없다: JSON 형식이 아니다");
    }
  }

  /** 획 하나가 우리가 아는 모양인지 확인하고 그 모양으로 돌려준다. */
  private static toStroke(value: unknown): SignatureStroke {
    if (typeof value !== "object" || value === null || !("points" in value)) {
      throw new Error("서명은 획 목록이어야 한다");
    }
    const points = (value as { points: unknown }).points;
    if (!Array.isArray(points)) throw new Error("서명은 획 목록이어야 한다");
    const stroke: SignatureStroke = { points: points.map((point) => StrokeSerializer.toPoint(point)) };
    StrokeSerializer.assertStroke(stroke);
    return stroke;
  }

  /** 점 하나가 x·y(그리고 필압)인지 확인한다. */
  private static toPoint(value: unknown): SignaturePoint {
    if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
      throw new Error("좌표는 x·y와 선택적 필압으로 이루어진다");
    }
    for (const part of value) {
      if (typeof part !== "number" || !Number.isFinite(part)) {
        throw new Error("좌표는 숫자여야 한다");
      }
    }
    const [x, y, pressure] = value as [number, number, number?];
    return pressure === undefined ? [x, y] : [x, y, pressure];
  }

  /**
   * 점이 하나도 없는 획을 막는다.
   *
   * 획은 있는데 점이 없으면 화면에는 아무것도 그려지지 않는다. 그런 자료가
   * 서명으로 저장되면 "서명했다"는 기록만 남고 무엇을 그렸는지는 없다.
   */
  private static assertStroke(stroke: SignatureStroke): void {
    if (stroke.points.length === 0) throw new Error("점이 없는 획은 서명이 아니다");
  }
}
