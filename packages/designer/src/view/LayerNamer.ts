import {
  ContentResolver,
  type BoxElement,
  type Element,
  type ElementVisitor,
  type FieldElement,
  type ImageElement,
  type LineElement,
  type SignatureElement,
  type TableElement,
  type TextElement,
} from "@report-tool/core";

/**
 * Layers 패널에 보여줄 요소 이름을 내용에서 도출한다.
 *
 * 이름을 템플릿에 저장하지 않는 이유는, 저장하면 문구를 고친 뒤에도 옛 이름이
 * 남아 목록과 문서가 어긋나기 때문이다. 도출하면 항상 현재 내용과 일치한다.
 */
export class LayerNamer implements ElementVisitor<string> {
  /** 목록 한 줄을 넘기지 않도록 표시 길이를 제한한다. */
  private static readonly MAX_LENGTH = 18;

  /** 화면이 요소 종류를 모른 채 이름을 얻게 한다. */
  name(element: Element): string {
    return element.accept(this);
  }

  /** 실제 문구를 그대로 보여주되 데이터 문구는 원본 표현을 유지한다. */
  visitText(element: TextElement): string {
    const text = element.content.kind === "literal"
      ? element.content.value
      : ContentResolver.resolve(element.content, {});
    return this.shorten(text.trim(), "텍스트");
  }

  /** 필드는 연결된 데이터 경로가 정체성이므로 경로를 보여준다. */
  visitField(element: FieldElement): string {
    return this.shorten(element.binding.path.toString(), "데이터 필드");
  }

  /** 표는 구조를 즉시 알 수 있게 열과 헤더 문구를 함께 보여준다. */
  visitTable(element: TableElement): string {
    const headers = element.columns.map((column) => column.header).join("·");
    return this.shorten(`표 ${element.columns.length}열 ${headers}`, "표");
  }

  /** 이미지는 자산 식별자로 구분하고 비어 있으면 상태를 알린다. */
  visitImage(element: ImageElement): string {
    if (element.assetId !== undefined && element.assetId.length > 0) {
      return this.shorten(element.assetId, "이미지");
    }
    if (element.binding !== undefined) {
      return this.shorten(element.binding.path.toString(), "이미지");
    }
    return "이미지 (출처 없음)";
  }

  /** 채움 여부로 배경 상자와 테두리 상자를 구분해 보여준다. */
  visitBox(element: BoxElement): string {
    return element.fill === undefined ? "테두리 상자" : "채운 상자";
  }

  /** 선은 방향을 알 수 있게 가로·세로·대각을 구분한다. */
  visitLine(element: LineElement): string {
    if (element.frame.height === 0) return "가로선";
    if (element.frame.width === 0) return "세로선";
    return "선";
  }

  /** 서명은 누가 서명하는 자리인지 먼저 보이게 한다. */
  visitSignature(element: SignatureElement): string {
    return this.shorten(`서명 ${element.signer}`, "서명");
  }

  /** 빈 문구와 너무 긴 문구를 목록에서 같은 규칙으로 다듬는다. */
  private shorten(value: string, fallback: string): string {
    if (value.length === 0) return fallback;
    if (value.length <= LayerNamer.MAX_LENGTH) return value;
    return `${value.slice(0, LayerNamer.MAX_LENGTH)}…`;
  }
}
