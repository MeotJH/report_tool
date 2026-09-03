import { TextStyle, type TextStyleOptions } from "@report-tool/core";

/**
 * 새로 만드는 요소가 **그 문서가 선언한 글꼴**로 시작하게 한다.
 *
 * 글꼴 이름을 도구마다 박아 두면, 맑은 고딕으로 만든 문서에서도 요소를 놓을 때마다
 * Pretendard로 생긴다. 사람은 요소를 만든 뒤 매번 글꼴을 바꿔야 하고, 한 번 잊으면
 * 그 요소만 다른 글꼴로 발행된다. 서른 개 요소짜리 문서에서는 반드시 잊는다.
 *
 * 더 나쁜 경우도 있다. 호스트가 맑은 고딕 파일만 주기로 한 문서에서 Pretendard
 * 요소가 생기면, 편집기는 그 요소를 시스템에 깔린 글꼴로 재고 발행본은 다른 파일을
 * 임베딩한다. 화면에서 본 줄바꿈이 발행본과 달라지고, 그 차이는 발행본에서만
 * 드러난다.
 *
 * 그래서 기준을 하나로 정한다 — **문서가 선언한 첫 글꼴**이다. 선언이 곧 호스트가
 * 파일을 주기로 한 목록이므로, 이 값은 항상 편집기가 실제로 잴 수 있는 글꼴이다.
 */
export class DocumentFont {
  /**
   * 선언이 하나도 없는 문서에서 쓸 글꼴이다.
   *
   * 여기까지 오면 어차피 파일을 받을 수 없어 화면이 경고를 띄운다. 그래도 요소를
   * 못 만드는 것보다는 만들어 놓고 글꼴을 고르게 하는 편이 낫다.
   */
  private static readonly FALLBACK = "Pretendard";

  /** 문서의 글꼴 선언을 그대로 받는다. 순서가 곧 우선순위다. */
  constructor(private readonly declared: readonly string[]) {}

  /** 이 문서에서 새 요소가 쓸 글꼴 가족 이름이다. */
  family(): string {
    return this.declared[0] ?? DocumentFont.FALLBACK;
  }

  /** 이 문서의 글꼴로 글자 표현을 만든다. */
  style(sizePt: number, options: Partial<TextStyleOptions> = {}): TextStyle {
    return new TextStyle(this.family(), sizePt, options);
  }
}
