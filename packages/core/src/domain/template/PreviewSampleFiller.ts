import type { TemplateVariable } from "./TemplateVariable.js";

/**
 * 편집기 미리보기에 쓸 자료를 만든다.
 *
 * 방금 선언한 변수를 캔버스에 놓으면 미리보기가 빈칸이 된다. 그러면 글자가 프레임을
 * 넘치는지, 크기가 맞는지 아무것도 확인할 수 없다. 그래서 **호스트가 준 샘플에
 * 없는 경로만** 선언에 적어 둔 예시로 채운다.
 *
 * 순서를 뒤집지 않는 것이 중요하다. 호스트 샘플이 항상 이긴다 — 예시가 이기면
 * 담당자는 실제 데이터가 아닌 것을 보면서 양식을 맞추게 된다.
 *
 * **발행에는 쓰이지 않는다.** 발행 데이터는 호스트가 준 것뿐이고, 이 자리는
 * 편집기 화면에서만 산다.
 */
export class PreviewSampleFiller {
  /** 호스트 샘플을 바탕으로, 비어 있는 선언 경로를 예시로 채운 사본을 만든다. */
  static fill(given: unknown, variables: readonly TemplateVariable[]): unknown {
    let filled = PreviewSampleFiller.copyObject(given);
    for (const variable of variables) {
      if (variable.sample === null) continue;
      filled = PreviewSampleFiller.put(filled, variable.name.split("."), variable.sample);
    }
    return filled;
  }

  /**
   * 경로를 따라 내려가며 값을 놓은 사본을 돌려준다.
   *
   * 이미 값이 있으면 그대로 둔다. 중간 자리가 객체가 아니면(배열이거나 값이면)
   * 들어가지 않는다 — 배열의 몇 번째 행인지 정할 근거가 없고, 값을 객체로 바꾸면
   * 호스트가 준 자료를 왜곡한다.
   */
  private static put(
    target: Record<string, unknown>,
    path: readonly string[],
    sample: string,
  ): Record<string, unknown> {
    const [head, ...rest] = path;
    if (head === undefined) return target;
    const existing = target[head];
    if (rest.length === 0) {
      return existing === undefined ? { ...target, [head]: sample } : target;
    }
    if (existing !== undefined && !PreviewSampleFiller.isPlainObject(existing)) return target;
    return {
      ...target,
      [head]: PreviewSampleFiller.put(PreviewSampleFiller.copyObject(existing), rest, sample),
    };
  }

  /** 손대도 되는 사본으로 만든다. 객체가 아니면 빈 객체로 시작한다. */
  private static copyObject(value: unknown): Record<string, unknown> {
    return PreviewSampleFiller.isPlainObject(value) ? { ...value } : {};
  }

  /** 안으로 더 들어가도 되는 자리인지 본다. 배열은 아니다. */
  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
