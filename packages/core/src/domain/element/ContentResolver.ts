import type { Content } from "./Content.js";
import { TemplateExpression } from "./TemplateExpression.js";

/**
 * 저장 가능한 문구 설정과 실제 문자열 해석을 분리해 요소를 순수 데이터로 유지한다.
 */
export class ContentResolver {
  /** 문구 종류에 따라 고정값을 보존하거나 안전한 템플릿 치환을 적용한다. */
  static resolve(content: Content, data: unknown): string {
    if (content.kind === "literal") {
      return content.value;
    }

    return TemplateExpression.render(content.value, data);
  }
}
