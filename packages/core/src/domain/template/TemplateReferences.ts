import { FieldElement } from "../element/FieldElement.js";
import { ImageElement } from "../element/ImageElement.js";
import { TableElement } from "../element/TableElement.js";
import { BoundTableSource, StaticTableSource } from "../element/TableSource.js";
import { TextElement } from "../element/TextElement.js";
import type { Element } from "../element/Element.js";
import { TemplateExpression } from "../element/TemplateExpression.js";
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
   *
   * 정적 행에 사람이 써 넣은 표현식도 함께 모은다. 그 자리도 발행 시 데이터로
   * 채워지므로, 경로에 오타가 있으면 다른 참조와 똑같이 빈칸으로 나간다.
   */
  private tablePaths(element: TableElement): readonly string[] {
    const paths: string[] = [];
    if (element.source instanceof BoundTableSource) {
      paths.push(element.source.binding.path.toString());
    }
    paths.push(...element.columns.flatMap((column) => this.expressionPaths(column.cellTemplate)));
    paths.push(...this.staticCellPaths(element));
    return paths.filter((path) => !path.startsWith("row."));
  }

  /** 정적 행의 문자열 셀에 들어 있는 치환 경로를 모두 꺼낸다. */
  private staticCellPaths(element: TableElement): readonly string[] {
    if (!(element.source instanceof StaticTableSource)) return [];
    return element.source.rows.flatMap((row) => Object
      .values(row)
      .filter((value): value is string => typeof value === "string")
      .flatMap((value) => this.expressionPaths(value)));
  }

  /** 치환하는 쪽과 같은 규칙으로 문구 안의 경로를 꺼낸다. */
  private expressionPaths(text: string): readonly string[] {
    return TemplateExpression.pathsIn(text);
  }
}
