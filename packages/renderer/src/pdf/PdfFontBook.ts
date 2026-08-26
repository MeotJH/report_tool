import type { TextStyle, TextWidthMeasurer } from "@report-tool/core";
import type { PDFFont } from "pdf-lib";

/**
 * 임베딩한 폰트를 찾는 규칙과 글자 폭을 재는 방법을 한곳에 둔다.
 *
 * 줄 나누기와 행 높이는 문서 전체를 배치하기 전에 계산해야 하는데, 그리는 쪽만
 * 폰트를 들고 있으면 배치 계산이 폰트를 찾는 규칙을 다시 구현하게 된다. 두 규칙이
 * 갈리면 배치할 때 잰 폭과 그릴 때 쓰는 폰트가 달라져 줄이 어긋난다.
 */
export class PdfFontBook {
  /** 폰트 가족과 굵기를 하나의 Map 키로 결합한다. */
  static key(family: string, weight: number): string {
    return `${family}:${weight}`;
  }

  /** 임베딩이 끝난 폰트 묶음을 그대로 보관한다. */
  constructor(private readonly fonts: ReadonlyMap<string, PDFFont>) {}

  /** 텍스트 굵기에 정확히 맞는 폰트를 찾고 500은 Regular로 안전하게 대체한다. */
  find(style: TextStyle): PDFFont {
    const exact = this.fonts.get(PdfFontBook.key(style.font, style.weight));
    const fallback = this.fonts.get(PdfFontBook.key(style.font, 400));
    const font = exact ?? fallback ?? this.fonts.values().next().value;
    if (font === undefined) {
      throw new Error(`PDF 폰트 ${style.font}을 찾을 수 없다`);
    }
    return font;
  }

  /** 도메인 줄 계산에 넘길, 실제 글리프 폭을 재는 함수를 만든다. */
  measurerFor(style: TextStyle): TextWidthMeasurer {
    const font = this.find(style);
    return (text: string, sizePt: number): number => font.widthOfTextAtSize(text, sizePt);
  }

  /**
   * 스타일이 없는 자리(서명 안내 문구)가 쓸 기본 폰트 가족 이름을 준다.
   *
   * 임베딩한 폰트 객체의 이름은 서브셋 접두사가 붙어 템플릿이 적은 가족명과
   * 다르다. 스타일을 만들 때는 등록 키에 남아 있는 가족명을 써야 한다.
   */
  firstFamily(): string {
    const firstKey = this.fonts.keys().next().value;
    if (firstKey === undefined) throw new Error("PDF에 등록된 폰트가 없다");
    return firstKey.split(":")[0] ?? firstKey;
  }

  /** 워터마크처럼 스타일이 없는 그리기가 쓸 폰트를 하나 고른다. */
  any(): PDFFont {
    const font = this.fonts.values().next().value;
    if (font === undefined) throw new Error("임베딩된 폰트가 없다");
    return font;
  }
}
