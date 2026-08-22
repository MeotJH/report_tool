import { Frame } from "./Frame.js";

/** 지원하는 표준 용지 규격만 템플릿에 저장되도록 제한한다. */
export type PageSize = "A4" | "A5" | "LETTER";

/** 페이지의 인쇄 방향을 지원하는 두 방향으로 제한한다. */
export type PageOrientation = "portrait" | "landscape";

/** CSS 관례와 같은 상·우·하·좌 순서로 페이지 여백을 보존한다. */
export type PageMargin = readonly [number, number, number, number];

/**
 * 표준 용지 크기와 여백을 함께 관리해 요소를 배치할 수 있는 영역을 일관되게 계산한다.
 */
export class PageSpec {
  private static readonly SIZES_MM: Readonly<
    Record<PageSize, Readonly<{ width: number; height: number }>>
  > = {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    LETTER: { width: 215.9, height: 279.4 },
  };

  private readonly margin: PageMargin;

  /** 외부에서 전달한 여백 배열의 변경이 페이지 규격에 영향을 주지 않도록 복사해 보관한다. */
  constructor(
    private readonly size: PageSize,
    private readonly orientation: PageOrientation,
    margin: PageMargin,
  ) {
    this.margin = [...margin];
  }

  /** 인쇄 방향이 반영된 실제 페이지 너비를 제공한다. */
  widthMm(): number {
    const size = PageSpec.SIZES_MM[this.size];
    return this.orientation === "landscape" ? size.height : size.width;
  }

  /** 인쇄 방향이 반영된 실제 페이지 높이를 제공한다. */
  heightMm(): number {
    const size = PageSpec.SIZES_MM[this.size];
    return this.orientation === "landscape" ? size.width : size.height;
  }

  /** 요소가 여백을 침범하지 않도록 실제로 배치 가능한 영역을 계산한다. */
  contentFrame(): Frame {
    const [top, right, bottom, left] = this.margin;
    return new Frame(
      left,
      top,
      this.widthMm() - right - left,
      this.heightMm() - top - bottom,
    );
  }

  /** 편집기 페이지 속성 패널이 현재 용지 규격을 표시할 수 있게 한다. */
  sizeName(): PageSize {
    return this.size;
  }

  /** 편집기 페이지 속성 패널이 현재 인쇄 방향을 표시할 수 있게 한다. */
  orientationName(): PageOrientation {
    return this.orientation;
  }

  /** 내부 배열을 노출하지 않고 현재 여백 값을 제공한다. */
  marginMm(): PageMargin {
    return [...this.margin];
  }

  /** 용지 규격만 바꾼 새 페이지 설정을 만들어 여백과 방향을 유지한다. */
  withSize(size: PageSize): PageSpec {
    return new PageSpec(size, this.orientation, this.margin);
  }

  /** 인쇄 방향만 바꾼 새 페이지 설정을 만들어 용지와 여백을 유지한다. */
  withOrientation(orientation: PageOrientation): PageSpec {
    return new PageSpec(this.size, orientation, this.margin);
  }

  /**
   * 배치 가능한 영역이 사라지는 여백을 미리 막고 새 페이지 설정을 만든다.
   *
   * Frame이 음수 크기에서 던지는 예외보다 원인이 분명한 메시지를 주기 위해
   * contentFrame()을 부르지 않고 남는 폭과 높이를 직접 계산한다.
   */
  withMargin(margin: PageMargin): PageSpec {
    const [top, right, bottom, left] = margin;
    if (margin.some((value) => value < 0)) {
      throw new Error("페이지 여백은 음수가 될 수 없다");
    }
    if (this.widthMm() - left - right <= 0 || this.heightMm() - top - bottom <= 0) {
      throw new Error("여백이 너무 커서 배치할 수 있는 영역이 남지 않는다");
    }
    return new PageSpec(this.size, this.orientation, margin);
  }
}
