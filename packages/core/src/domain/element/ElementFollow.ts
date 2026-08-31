/** 표에 딸린 요소가 그 표를 따라가는 두 가지 방식을 제한한다. */
export type FollowMode = "caption" | "flow";

/**
 * 이 요소가 어떤 표를 어떤 방식으로 따라가는지 담는다.
 *
 * 표에 딸린 요소는 두 종류다. 표 **위**의 제목·기간은 표가 쪽을 넘을 때마다
 * 같은 모양으로 다시 나와야 하고(`caption`), 표 **아래**의 다음 구역은 표가
 * 길어진 만큼 밀려 내려가야 한다(`flow`).
 *
 * 둘을 좌표로 구분하려 하면 반드시 틀린다. 표의 `frame`은 표가 쓸 수 있는
 * 자리일 뿐 실제로 쓴 높이가 아니고, 실제로 쓴 높이는 발행할 데이터가 정하기
 * 때문이다. 그래서 어느 쪽인지는 사용자가 정하고 여기에 남긴다.
 */
export class ElementFollow {
  /** 따라갈 표와 방식을 함께 보존해 한쪽만 남는 상태를 만들지 않는다. */
  private constructor(
    public readonly elementId: string,
    public readonly mode: FollowMode,
  ) {}

  /** 표가 이어지는 쪽마다 같은 자리에 함께 나오는 제목·기간을 만든다. */
  static caption(elementId: string): ElementFollow {
    return new ElementFollow(elementId, "caption");
  }

  /** 표가 끝난 자리 아래로 밀려 내려가는 다음 구역을 만든다. */
  static flow(elementId: string): ElementFollow {
    return new ElementFollow(elementId, "flow");
  }

  /** 방식을 이름으로 받아 저장 데이터와 화면 선택을 같은 통로로 만든다. */
  static of(elementId: string, mode: FollowMode): ElementFollow {
    return mode === "flow" ? ElementFollow.flow(elementId) : ElementFollow.caption(elementId);
  }

  /**
   * 저장된 값을 복원한다. 연결이 없거나 알아볼 수 없으면 `null`이다.
   *
   * 연결이 없던 시절에 저장된 요소는 아무 표도 따라가지 않는다. 방식이 빠진
   * 값은 제목으로 본다 — 이 개념이 처음 생겼을 때는 그것뿐이었다.
   */
  static fromJSON(value: unknown): ElementFollow | null {
    if (typeof value === "string") return ElementFollow.caption(value);
    if (value === null || typeof value !== "object") return null;
    const json = value as Record<string, unknown>;
    if (typeof json.elementId !== "string") return null;
    return ElementFollow.of(json.elementId, json.mode === "flow" ? "flow" : "caption");
  }

  /** 같은 표를 따라가되 방식만 바꾼 새 연결을 만든다. */
  withMode(mode: FollowMode): ElementFollow {
    return ElementFollow.of(this.elementId, mode);
  }

  /** 연결을 클래스 구현과 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return { elementId: this.elementId, mode: this.mode };
  }
}
