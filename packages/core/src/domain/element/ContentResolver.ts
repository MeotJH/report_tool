import type { Content } from "./Content.js";
import { ContentText } from "./ContentText.js";

/**
 * 저장 가능한 문구 설정과 실제 문자열 해석을 분리해 요소를 순수 데이터로 유지한다.
 *
 * 치환 규칙 자체는 `ContentText.resolved()`가 갖는다. 여기에 규칙을 한 번 더 적으면
 * 설계 화면과 발행본이 서로 다른 규칙을 쓰게 되고, 그 차이는 발행본에서만 드러난다.
 */
export class ContentResolver {
  /** 발행 시점에 실제로 찍히는 문자열을 만든다. */
  static resolve(content: Content, data: unknown): string {
    return ContentText.resolved().textOf(content, data);
  }
}
