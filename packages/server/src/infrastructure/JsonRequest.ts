/**
 * 요청 본문을 읽는 방식을 컨트롤러마다 다시 쓰지 않게 한다.
 *
 * 같은 일을 컨트롤러마다 따로 하면 어떤 곳은 깨진 JSON에 500을, 어떤 곳은 400을
 * 돌려준다. 호출하는 쪽에서 보면 같은 잘못에 다른 답이 오는 셈이다.
 */
export class JsonRequest {
  /** 본문을 객체로 읽는다. JSON이 아니거나 객체가 아니면 `null`이다. */
  static async read(request: Request): Promise<Record<string, unknown> | null> {
    try {
      const parsed: unknown = await request.json();
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * 빠진 필수 값의 이름을 순서대로 준다.
   *
   * 무엇이 빠졌는지 알려 주지 않으면, 호출하는 쪽은 400을 받고도 어디를 고쳐야
   * 하는지 몰라 필드를 하나씩 지워 가며 찾아야 한다.
   */
  static missing(
    body: Readonly<Record<string, unknown>>,
    required: readonly string[],
  ): readonly string[] {
    return required.filter((name) => {
      const value = body[name];
      return value === undefined || value === null || value === "";
    });
  }
}
