/**
 * 외부 데이터의 중첩 구조를 점 표기 경로로 안전하게 조회할 수 있게 캡슐화한다.
 */
export class DataPath {
  private readonly segments: readonly string[];

  /** 잘못된 빈 경로가 데이터 바인딩으로 전파되지 않도록 생성 시점에 차단한다. */
  constructor(path: string) {
    if (path.length === 0) {
      throw new Error("데이터 경로는 비어 있을 수 없다");
    }

    this.segments = path.split(".");
  }

  /** 불완전한 외부 데이터에서도 예외 없이 호출자가 누락 여부를 판단하게 한다. */
  resolve(data: unknown): unknown {
    let current: unknown = data;

    for (const segment of this.segments) {
      if (current === null || typeof current !== "object") {
        return undefined;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}
