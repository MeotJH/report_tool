import { DataPath } from "../value/DataPath.js";

/**
 * 신뢰할 수 없는 템플릿 문구가 코드를 실행하지 않고 데이터 경로만 치환하게 한다.
 */
export class TemplateExpression {
  private static readonly EXPRESSION_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

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
