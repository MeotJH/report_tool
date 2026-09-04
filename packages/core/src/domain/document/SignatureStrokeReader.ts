import type { SignatureStroke } from "./SignatureRecord.js";

/**
 * 저장되거나 전송된 서명 획을 읽어 도메인 모양으로 되돌린다.
 *
 * 이 판단이 두 곳에 있으면 반드시 갈라진다. 실제로 갈라질 뻔했다 — 뷰어가 서버로
 * 보낼 때 쓰는 형식과, 저장소에서 발행 문서를 되살릴 때 쓰는 형식이 같은 자료인데
 * 읽는 코드가 따로 생길 참이었다. 갈라지면 **한쪽에서 저장한 서명을 다른 쪽이
 * 빈 것으로 읽는다.**
 *
 * 서명은 몇 년 뒤에 "이 사람이 무엇에 서명했는가"를 다시 그려 보여야 하는 자료다.
 * 그래서 모양이 어긋나면 조용히 넘기지 않고 어디가 어긋났는지 말한다.
 */
export class SignatureStrokeReader {
  /** 획 목록을 읽는다. 모양이 어긋나면 그 자리를 말하고 멈춘다. */
  static read(value: unknown): readonly SignatureStroke[] {
    if (!Array.isArray(value)) throw new Error("서명은 획 목록이어야 한다");
    return value.map((stroke) => SignatureStrokeReader.readStroke(stroke));
  }

  /** 획 하나가 우리가 아는 모양인지 확인하고 그 모양으로 돌려준다. */
  private static readStroke(value: unknown): SignatureStroke {
    if (typeof value !== "object" || value === null || !("points" in value)) {
      throw new Error("서명은 획 목록이어야 한다");
    }
    const points = (value as { points: unknown }).points;
    if (!Array.isArray(points)) throw new Error("서명은 획 목록이어야 한다");
    if (points.length === 0) throw new Error("점이 없는 획은 서명이 아니다");
    return { points: points.map((point) => SignatureStrokeReader.readPoint(point)) };
  }

  /** 점 하나가 x·y(그리고 필압)인지 확인한다. */
  private static readPoint(value: unknown): readonly [number, number, number?] {
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
}
