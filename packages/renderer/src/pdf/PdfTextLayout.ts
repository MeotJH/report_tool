import { TextStyle, type TextOverflow } from "@report-tool/core";

/** PDF 글자 폭을 실제 임베딩 폰트로 측정할 수 있게 구현 세부사항을 콜백으로 격리한다. */
export type TextWidthMeasurer = (text: string, size: number) => number;

/** 텍스트 배치 결과를 그리기 단계가 정책과 무관하게 사용할 수 있게 한다. */
export interface TextLayoutResult {
  readonly lines: string[];
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

/** mm 영역과 pt 글자 폭을 연결해 스타일의 넘침 정책에 맞는 배치를 계산한다. */
export class PdfTextLayout {
  private static readonly POINTS_PER_MM = 72 / 25.4;
  private readonly strategies: Readonly<Record<TextOverflow, TextOverflowStrategy>> = {
    wrap: new WrapTextStrategy(),
    shrink: new ShrinkTextStrategy(),
    truncate: new TruncateTextStrategy(),
  };

  /** 넉넉한 문구는 보존하고 넘치는 문구만 지정된 전략에 위임한다. */
  layout(
    text: string,
    style: TextStyle,
    maxWidthMm: number,
    measureWidth: TextWidthMeasurer,
  ): TextLayoutResult {
    const maxWidthPt = maxWidthMm * PdfTextLayout.POINTS_PER_MM;
    if (measureWidth(text, style.size) <= maxWidthPt) {
      return { lines: [text], fontSize: style.size };
    }

    return this.strategies[style.overflow].layout(
      text,
      style,
      maxWidthPt,
      measureWidth,
    );
  }
}
