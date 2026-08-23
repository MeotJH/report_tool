import {
  BindingResolver,
  type BoxElement,
  ContentResolver,
  type ElementVisitor,
  type FieldElement,
  type ImageElement,
  type LineElement,
  type SignatureElement,
  TableCellResolver,
  type TableElement,
  Template,
  type TextElement,
} from "@report-tool/core";

/** 실제 출력 문자열만 모아 한글 폰트 서브셋이 필요한 글리프를 빠짐없이 알게 한다. */
export class UsedCharCollector implements ElementVisitor<string> {
  private readonly cellResolver = new TableCellResolver();

  /** 데이터 해석 규칙을 렌더러와 동일하게 사용해 수집 문자와 출력 문자가 어긋나지 않게 한다. */
  constructor(
    private readonly data: unknown,
    private readonly bindingResolver: BindingResolver,
  ) {}

  /** 모든 요소를 Visitor로 순회해 중복이 제거된 서브셋 대상 문자열을 만든다. */
  collect(template: Template): string {
    const characters = template
      .getElements()
      .map((element) => element.accept(this))
      .join("");
    return [...new Set(characters)].join("");
  }

  /** 고정 문구와 템플릿 문구가 실제 데이터로 치환된 결과를 수집한다. */
  visitText(element: TextElement): string {
    return ContentResolver.resolve(element.content, this.data);
  }

  /** 필드 포맷까지 적용된 최종 표시 문자열을 수집한다. */
  visitField(element: FieldElement): string {
    return this.bindingResolver.resolve(element.binding, this.data);
  }

  /** 표 머리글과 모든 행·열의 최종 셀 문자를 함께 수집한다. */
  visitTable(element: TableElement): string {
    const headers = element.columns.map((column) => column.header).join("");
    const cells = element.source
      .resolveRows(this.data)
      .flatMap((row) => this.cellResolver.resolveRow(element.columns, row, this.data));
    return headers + cells.join("");
  }

  /** 이미지는 폰트 글리프를 사용하지 않으므로 수집 결과를 비워둔다. */
  visitImage(_element: ImageElement): string {
    return "";
  }

  /** 장식 상자는 폰트 글리프를 사용하지 않으므로 수집 결과를 비워둔다. */
  visitBox(_element: BoxElement): string {
    return "";
  }

  /** 선 도형은 폰트 글리프를 사용하지 않으므로 수집 결과를 비워둔다. */
  visitLine(_element: LineElement): string {
    return "";
  }

  /** 발행 시 비어 있는 서명란에서는 안내 문구에 필요한 문자만 수집한다. */
  visitSignature(element: SignatureElement): string {
    return element.label ?? "";
  }
}
