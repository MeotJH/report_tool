import { SignatureStrokeReader, type SignatureStroke } from "@report-tool/core";

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

  /**
   * 저장해 둔 문자열을 다시 그릴 수 있는 획으로 되돌린다.
   *
   * 모양을 판단하는 일은 도메인(`SignatureStrokeReader`)이 한다. 여기서 또 판단하면
   * 서버로 보낼 때와 저장소에서 되살릴 때의 규칙이 갈리고, 그때는 **한쪽에서 저장한
   * 서명을 다른 쪽이 빈 것으로 읽는다.**
   */
  static fromJSON(json: string): readonly SignatureStroke[] {
    return SignatureStrokeReader.read(StrokeSerializer.parse(json));
  }

  /** 깨진 문자열을 만났다는 사실을 그대로 알린다. */
  private static parse(json: string): unknown {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error("서명을 읽을 수 없다: JSON 형식이 아니다");
    }
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
