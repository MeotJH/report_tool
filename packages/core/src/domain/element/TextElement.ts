import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import type { Content } from "./Content.js";
import { Element, type ElementCommonChanges } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";

/**
 * 고정 문구와 데이터가 섞인 문구를 다른 요소와 독립적으로 배치하고 표현한다.
 */
export class TextElement extends Element {
  public readonly type = "text";

  /** 텍스트의 공통 배치 정보와 문구·스타일을 하나의 불변 요소로 보존한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    public readonly content: Content,
    public readonly style: TextStyle,
    hidden = false,
    pageIndex = 0,
  ) {
    super(id, frame, z, locked, hidden, pageIndex);
  }

  /** 방문자가 텍스트 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitText(this);
  }

  /** 캔버스 직접 입력이 스타일과 배치를 유지한 채 문구만 바꾸게 한다. */
  withContent(content: Content): TextElement {
    return this.copy({ content });
  }

  /** Inspector의 글꼴·크기·정렬 변경이 문구를 잃지 않게 한다. */
  withStyle(style: TextStyle): TextElement {
    return this.copy({ style });
  }

  /** 텍스트 내용과 스타일을 보존하면서 공통 배치 상태만 바꾼다. */
  protected withCommon(changes: ElementCommonChanges): TextElement {
    return this.copy({}, changes);
  }

  /** 텍스트 고유 속성을 라이브러리 구현과 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      content: { ...this.content },
      style: this.style.toJSON(),
    };
  }

  /** 모든 변경 메서드가 같은 생성자 복사 규칙을 공유하게 한다. */
  private copy(
    changes: Readonly<{ content?: Content; style?: TextStyle }>,
    common: ElementCommonChanges = {},
  ): TextElement {
    const resolved = this.mergeCommon(common);
    return new TextElement(
      this.id,
      resolved.frame,
      resolved.z,
      resolved.locked,
      changes.content ?? this.content,
      changes.style ?? this.style,
      resolved.hidden,
      resolved.pageIndex,
    );
  }
}
