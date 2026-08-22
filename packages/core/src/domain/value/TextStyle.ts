/** 텍스트 굵기를 제품에서 지원하는 폰트 파일 범위로 제한한다. */
export type FontWeight = 400 | 500 | 700;

/** 텍스트의 가로 정렬 값을 렌더러가 공통으로 해석할 수 있게 제한한다. */
export type TextAlign = "left" | "center" | "right";

/** 텍스트의 세로 정렬 값을 렌더러가 공통으로 해석할 수 있게 제한한다. */
export type TextVerticalAlign = "top" | "middle" | "bottom";

/** 영역을 넘는 텍스트를 처리하는 정책을 명시적인 값으로 제한한다. */
export type TextOverflow = "wrap" | "shrink" | "truncate";

/** 필수값 외의 텍스트 표현을 선택적으로 재정의할 수 있게 한다. */
export interface TextStyleOptions {
  readonly weight: FontWeight;
  readonly italic: boolean;
  readonly color: string;
  readonly align: TextAlign;
  readonly valign: TextVerticalAlign;
  readonly lineHeight: number;
  readonly overflow: TextOverflow;
}

/**
 * 텍스트 표현 규칙을 하나의 불변 값으로 묶어 모든 렌더러가 같은 스타일을 해석하게 한다.
 */
export class TextStyle {
  public readonly weight: FontWeight;
  public readonly italic: boolean;
  public readonly color: string;
  public readonly align: TextAlign;
  public readonly valign: TextVerticalAlign;
  public readonly lineHeight: number;
  public readonly overflow: TextOverflow;

  /** 필수 폰트 정보에 안전한 기본 표현을 결합해 완전한 스타일을 만든다. */
  constructor(
    public readonly font: string,
    public readonly size: number,
    options: Partial<TextStyleOptions> = {},
  ) {
    this.weight = options.weight ?? 400;
    this.italic = options.italic ?? false;
    this.color = options.color ?? "#000000";
    this.align = options.align ?? "left";
    this.valign = options.valign ?? "top";
    this.lineHeight = options.lineHeight ?? 1.4;
    this.overflow = options.overflow ?? "wrap";
  }

  /**
   * 지정한 표현 속성만 바꾼 새 스타일을 만든다.
   *
   * Inspector는 글꼴·크기·정렬을 각각 따로 바꾸므로, 바꾸지 않은 나머지를
   * 호출부가 매번 나열하면 새 속성이 추가될 때 조용히 초기화된다.
   */
  with(changes: Partial<TextStyleOptions & { font: string; size: number }>): TextStyle {
    return new TextStyle(changes.font ?? this.font, changes.size ?? this.size, {
      weight: changes.weight ?? this.weight,
      italic: changes.italic ?? this.italic,
      color: changes.color ?? this.color,
      align: changes.align ?? this.align,
      valign: changes.valign ?? this.valign,
      lineHeight: changes.lineHeight ?? this.lineHeight,
      overflow: changes.overflow ?? this.overflow,
    });
  }

  /** 글자 축소 정책이 나머지 스타일을 잃지 않고 크기만 변경하게 한다. */
  scaledBy(factor: number): TextStyle {
    return new TextStyle(this.font, this.size * factor, {
      weight: this.weight,
      italic: this.italic,
      color: this.color,
      align: this.align,
      valign: this.valign,
      lineHeight: this.lineHeight,
      overflow: this.overflow,
    });
  }

  /** 텍스트 스타일을 클래스 구현과 무관한 템플릿 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      font: this.font,
      size: this.size,
      weight: this.weight,
      italic: this.italic,
      color: this.color,
      align: this.align,
      valign: this.valign,
      lineHeight: this.lineHeight,
      overflow: this.overflow,
    };
  }
}
