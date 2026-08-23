import { FieldElement } from "../element/FieldElement.js";
import { ImageElement } from "../element/ImageElement.js";
import { TableElement } from "../element/TableElement.js";
import { BoundTableSource } from "../element/TableSource.js";
import { TextElement } from "../element/TextElement.js";
import type { Element } from "../element/Element.js";
import type { Template } from "./Template.js";

/** 어떤 요소가 어떤 데이터 경로를 참조하는지 함께 전달한다. */
export interface DataReference {
  readonly elementId: string;
  readonly path: string;
}

/**
 * 템플릿 안에서 데이터 경로를 참조하는 모든 자리를 한곳에서 수집한다.
 *
 * 참조는 필드 바인딩·표 Source·표 셀 문구·이미지 출처·데이터 문구에 흩어져 있다.
 * 검증기와 편집기가 각자 뒤지면 요소를 추가할 때 한쪽이 반드시 빠뜨린다.
 */
export class TemplateReferences {
  /** 문구 안의 치환 경로를 찾는 규칙은 TemplateExpression과 같아야 한다. */
  private static readonly EXPRESSION_PATTERN = /\{\{\s*([\p{L}\p{N}_.]+)\s*\}\}/gu;

  /** 템플릿 전체의 참조를 요소 식별자와 함께 모은다. */
  collect(template: Template): readonly DataReference[] {
    return template.getElements().flatMap((element) => this
      .pathsOf(element)
      .map((path) => ({ elementId: element.id, path })));
  }

  /** 요소 하나가 참조하는 경로를 종류별 위치에서 모두 꺼낸다. */
  pathsOf(element: Element): readonly string[] {
    const paths: string[] = [];
    if (element instanceof FieldElement) {
      paths.push(element.binding.path.toString());
    }
    if (element instanceof ImageElement && element.binding !== undefined) {
      paths.push(element.binding.path.toString());
    }
    if (element instanceof TextElement && element.content.kind === "template") {
      paths.push(...this.expressionPaths(element.content.value));
    }
    if (element instanceof TableElement) {
      paths.push(...this.tablePaths(element));
    }
    return paths;
  }

  /**
   * 표의 Source 경로와 셀 문구의 경로를 함께 모은다.
   *
   * 셀 문구의 `row.` 접두사는 배열 한 줄 안의 키를 가리키는 것이므로
   * 문서 전체 경로가 아니다. 따라서 참조 목록에 넣지 않는다.
   */
  private tablePaths(element: TableElement): readonly string[] {
    const paths: string[] = [];
    if (element.source instanceof BoundTableSource) {
      paths.push(element.source.binding.path.toString());
    }
    paths.push(...element.columns
      .flatMap((column) => this.expressionPaths(column.cellTemplate))
      .filter((path) => !path.startsWith("row.")));
    return paths;
  }

  /** 문구 안의 치환 경로만 추출한다. */
  private expressionPaths(text: string): readonly string[] {
    return [...text.matchAll(TemplateReferences.EXPRESSION_PATTERN)]
      .map((match) => match[1] ?? "")
      .filter((path) => path.length > 0);
  }
}
