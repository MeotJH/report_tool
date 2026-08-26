import type { TextStyle, TextWidthMeasurer } from "@report-tool/core";
import { FontLibrary } from "./FontLibrary.js";

/**
 * 캔버스가 도메인 줄 계산에 넘길 글자 폭 측정기를 만든다.
 *
 * 줄을 나누는 규칙은 도메인이 하나로 정하지만, 실제 글자 폭은 폰트가 정한다.
 * 브라우저에서 그 값을 아는 것은 2D 컨텍스트뿐이므로 여기서만 브라우저 API를 만난다.
 *
 * 측정 단위는 pt다. 폰트 크기를 pt 값 그대로 px에 넣어 재면 비율이 같으므로,
 * 도메인이 쓰는 pt 폭과 같은 축의 값이 나온다.
 *
 * **어떤 글꼴로 재는지가 결과를 정한다.** 가족 이름으로 재면 보는 사람 컴퓨터에
 * 깔린 글꼴이 잡혀 발행본이 임베딩하는 파일과 폭이 달라진다. 그래서 호스트가 준
 * 파일을 등록해 둔 `FontLibrary`에 이름을 물어본다.
 */
export class CanvasTextMeasurer {
  private readonly context: CanvasRenderingContext2D | null;

  /** 측정 전용 컨텍스트를 한 번만 만들어 요소마다 다시 만들지 않게 한다. */
  constructor(private readonly fonts: FontLibrary = new FontLibrary()) {
    this.context = document.createElement("canvas").getContext("2d");
  }

  /**
   * 스타일에 맞는 폭 측정 함수를 만든다.
   *
   * 컨텍스트를 얻지 못하는 환경에서는 글자 수 기반 근사로 물러난다.
   * 줄 나누기가 조금 어긋나는 것이, 편집기가 통째로 뜨지 않는 것보다 낫다.
   */
  forStyle(style: TextStyle): TextWidthMeasurer {
    const context = this.context;
    if (context === null) return CanvasTextMeasurer.approximate;
    const weight = style.italic ? `italic ${style.weight}` : `${style.weight}`;
    const family = this.fonts.familyFor(style.font);
    return (text: string, sizePt: number): number => {
      context.font = `${weight} ${sizePt}px ${family}`;
      return context.measureText(text).width;
    };
  }

  /** 컨텍스트가 없을 때 쓰는 최소 근사다. 한글 폭을 기준으로 잡는다. */
  private static approximate(text: string, sizePt: number): number {
    return text.length * sizePt * 0.9;
  }
}
