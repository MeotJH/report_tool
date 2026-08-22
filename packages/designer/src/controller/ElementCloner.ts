import { ElementFactory, type Element } from "@report-tool/core";

/**
 * 복제와 붙여넣기가 요소 종류별 생성자를 알지 않아도 되게 한다.
 *
 * 저장 형식으로 왕복시키는 방식을 택한 이유는, 요소가 추가되거나 속성이 늘어나도
 * ElementFactory 한 곳만 최신이면 복제가 자동으로 따라오기 때문이다.
 * 종류별 clone 메서드를 두면 새 속성을 빠뜨려도 컴파일이 통과한다.
 */
export class ElementCloner {
  /** 원본과 겹쳐 보이지 않도록 살짝 밀어 놓는 기본 간격을 mm로 고정한다. */
  private static readonly DEFAULT_OFFSET_MM = 4;

  /** 원본 속성을 그대로 유지하고 새 식별자와 위치만 가진 사본을 만든다. */
  clone(element: Element, offsetMm = ElementCloner.DEFAULT_OFFSET_MM): Element {
    const json = ElementFactory.toJSON(element);
    json.id = this.createId();
    const copy = ElementFactory.fromJSON(json);
    if (offsetMm === 0) return copy;
    return copy.withFrame(element.frame.moveBy(offsetMm, offsetMm));
  }

  /** 여러 요소를 함께 복제할 때 상대 위치가 유지되도록 같은 간격을 적용한다. */
  cloneAll(
    elements: readonly Element[],
    offsetMm = ElementCloner.DEFAULT_OFFSET_MM,
  ): readonly Element[] {
    return elements.map((element) => this.clone(element, offsetMm));
  }

  /** 사본이 원본과 충돌하지 않는 브라우저 표준 식별자를 갖게 한다. */
  private createId(): string {
    return globalThis.crypto.randomUUID();
  }
}
