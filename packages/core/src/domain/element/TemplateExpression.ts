import { DataPath } from "../value/DataPath.js";

/**
 * 신뢰할 수 없는 템플릿 문구가 코드를 실행하지 않고 데이터 경로만 치환하게 한다.
 */
export class TemplateExpression {
  /**
   * 치환 대상으로 인정하는 경로 문자를 정의한다.
   *
   * 유니코드 글자를 허용하는 이유는 사용자가 정의하는 상수 이름이 한글이기 때문이다.
   * 넓혀도 안전한 이유는, 여기서 찾은 문자열이 코드로 실행되지 않고 DataPath의
   * 속성 조회에만 쓰이기 때문이다.
   */
  private static readonly EXPRESSION_PATTERN = /\{\{\s*([\p{L}\p{N}_.]+)\s*\}\}/gu;

  /**
   * 문구가 참조하는 데이터 경로를 순서대로 모은다.
   *
   * 치환하는 규칙과 찾는 규칙이 갈리면, 검증기가 못 본 경로가 발행 때 치환되거나
   * 반대로 경고만 뜨고 실제로는 아무것도 바뀌지 않는다. 규칙은 이 클래스에만 둔다.
   */
  static pathsIn(text: string): readonly string[] {
    return [...text.matchAll(TemplateExpression.EXPRESSION_PATTERN)]
      .map((match) => match[1] ?? "")
      .filter((path) => path.length > 0);
  }

  /** 허용된 점 표기 경로만 찾아 누락된 값은 빈 문자열로 안전하게 치환한다. */
  static render(text: string, data: unknown): string {
    return text.replace(
      TemplateExpression.EXPRESSION_PATTERN,
      (_matchedExpression: string, path: string): string => {
        const value = new DataPath(path).resolve(data);
        return value === null || value === undefined ? "" : String(value);
      },
    );
  }
}
