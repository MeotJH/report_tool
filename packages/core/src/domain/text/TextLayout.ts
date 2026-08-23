import { TextStyle, type TextOverflow } from "../value/TextStyle.js";

/**
 * 글자 폭 측정을 도메인 밖으로 밀어낸다.
 *
 * 실제 폭은 임베딩한 폰트 파일이 정하는데, 그 지식은 렌더러에만 있다.
 * domain이 폰트를 알면 브라우저·Node 어느 쪽에도 묶이므로 콜백으로만 받는다.
 * 반환 단위는 pt다.
 */
export type TextWidthMeasurer = (text: string, sizePt: number) => number;

/** 배치 결과를 그리는 쪽이 정책을 몰라도 쓸 수 있게 한다. */
export interface TextLayoutResult {
  readonly lines: readonly string[];
  readonly fontSize: number;
}

/** 서로 다른 넘침 처리 전략이 공유하는 배치 계약이다. */
interface TextOverflowStrategy {
  /** 주어진 pt 폭 안에서 정책에 맞는 줄과 글자 크기를 결정한다. */
  layout(
    text: string,
    style: TextStyle,
    maxWidthPt: number,
    measureWidth: TextWidthMeasurer,
  ): TextLayoutResult;
}

/** 단어 경계를 보존하면서 필요한 만큼 다음 줄로 보내는 전략이다. */
class WrapTextStrategy implements TextOverflowStrategy {
  /** 공백 단위 후보가 허용 폭을 넘는 순간 현재 줄을 확정한다. */
  layout(
    text: string,
    style: TextStyle,
    maxWidthPt: number,
    measureWidth: TextWidthMeasurer,
  ): TextLayoutResult {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words.shift() ?? "";
    for (const word of words) {
      const candidate = `${currentLine} ${word}`;
      if (measureWidth(candidate, style.size) <= maxWidthPt) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return { lines, fontSize: style.size };
  }
}

/** 한 줄을 유지해야 하는 문구를 읽을 수 있는 최소 크기까지만 축소하는 전략이다. */
class ShrinkTextStrategy implements TextOverflowStrategy {
  private static readonly MINIMUM_FONT_SIZE = 6;
  private static readonly SCALE_FACTOR = 0.95;

  /** 실제 폭이 맞을 때까지 5%씩 줄이되 6pt 아래로 내려가지 않게 한다. */
  layout(
    text: string,
    style: TextStyle,
    maxWidthPt: number,
    measureWidth: TextWidthMeasurer,
  ): TextLayoutResult {
    let fontSize = style.size;
    while (
      fontSize > ShrinkTextStrategy.MINIMUM_FONT_SIZE
      && measureWidth(text, fontSize) > maxWidthPt
    ) {
      fontSize = Math.max(
        ShrinkTextStrategy.MINIMUM_FONT_SIZE,
        fontSize * ShrinkTextStrategy.SCALE_FACTOR,
      );
    }
    return { lines: [text], fontSize };
  }
}

/** 한 줄 공간에 들어가는 접두부만 남기고 생략 사실을 표시하는 전략이다. */
class TruncateTextStrategy implements TextOverflowStrategy {
  /** 생략 부호까지 폭에 들어올 때까지 뒤쪽 문자를 하나씩 제거한다. */
  layout(
    text: string,
    style: TextStyle,
    maxWidthPt: number,
    measureWidth: TextWidthMeasurer,
  ): TextLayoutResult {
    let visibleText = text;
    while (visibleText.length > 0) {
      const candidate = `${visibleText}…`;
      if (measureWidth(candidate, style.size) <= maxWidthPt) {
        return { lines: [candidate], fontSize: style.size };
      }
      visibleText = visibleText.slice(0, -1);
    }
    return { lines: ["…"], fontSize: style.size };
  }
}

/**
 * 문구 하나가 몇 줄로 놓이는지를 화면과 PDF가 함께 쓰는 유일한 근거로 계산한다.
 *
 * 편집 캔버스와 발행 PDF가 각자 줄을 나누면 반드시 어긋난다. 실제로 어긋났었다 —
 * 캔버스는 넘치는 줄을 조용히 지우고 PDF는 종이 밖에 그렸다. 담당자가 본 문서와
 * 서명자가 받은 문서가 달라지므로, 줄 나누기는 이 클래스 하나만 결정한다.
 */
export class TextLayout {
  private static readonly POINTS_PER_MM = 72 / 25.4;
  private readonly strategies: Readonly<Record<TextOverflow, TextOverflowStrategy>> = {
    wrap: new WrapTextStrategy(),
    shrink: new ShrinkTextStrategy(),
    truncate: new TruncateTextStrategy(),
  };

  /**
   * 문단을 먼저 나누고 각 문단에 넘침 정책을 적용한다.
   *
   * 문단을 먼저 나누는 이유는 `\n`이 사용자가 직접 넣은 줄바꿈이기 때문이다.
   * 이것을 공백과 같이 취급하면 "제1조 각 호"가 한 덩어리로 묶여 순서가 뒤엉킨다.
   * 실제로 그렇게 발행됐었다.
   */
  layout(
    text: string,
    style: TextStyle,
    maxWidthMm: number,
    measureWidth: TextWidthMeasurer,
  ): TextLayoutResult {
    const maxWidthPt = maxWidthMm * TextLayout.POINTS_PER_MM;
    const results = text
      .split("\n")
      .map((paragraph) => this.layoutParagraph(paragraph, style, maxWidthPt, measureWidth));
    return {
      lines: results.flatMap((result) => result.lines),
      fontSize: this.smallestFontSize(results, style),
    };
  }

  /** 배치된 줄이 차지하는 세로 길이를 mm로 알려 준다. */
  heightMm(result: TextLayoutResult, style: TextStyle): number {
    const heightPt = result.lines.length * result.fontSize * style.lineHeight;
    return heightPt / TextLayout.POINTS_PER_MM;
  }

  /** 넉넉한 문단은 원문 그대로 두고 넘치는 문단만 전략에 위임한다. */
  private layoutParagraph(
    paragraph: string,
    style: TextStyle,
    maxWidthPt: number,
    measureWidth: TextWidthMeasurer,
  ): TextLayoutResult {
    if (paragraph === "") {
      return { lines: [""], fontSize: style.size };
    }
    if (measureWidth(paragraph, style.size) <= maxWidthPt) {
      return { lines: [paragraph], fontSize: style.size };
    }
    return this.strategies[style.overflow].layout(
      paragraph,
      style,
      maxWidthPt,
      measureWidth,
    );
  }

  /**
   * 문단마다 다른 크기가 나오면 가장 작은 크기로 통일한다.
   *
   * shrink 정책은 문단마다 다른 배율을 낼 수 있는데, 한 요소 안에서 글자 크기가
   * 들쭉날쭉하면 사용자는 그것을 오류로 읽는다. 줄 내용은 크기를 낮춰도 바뀌지 않는다.
   */
  private smallestFontSize(
    results: readonly TextLayoutResult[],
    style: TextStyle,
  ): number {
    return results.reduce(
      (smallest, result) => Math.min(smallest, result.fontSize),
      style.size,
    );
  }
}
