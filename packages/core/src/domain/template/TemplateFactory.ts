import { ElementFactory } from "../element/ElementFactory.js";
import type { Element } from "../element/Element.js";
import {
  PageSpec,
  type PageMargin,
  type PageOrientation,
  type PageSize,
} from "../value/PageSpec.js";
import { Template, type TemplateStatus } from "./Template.js";
import {
  TemplateVariable,
  type VariableValueType,
} from "./TemplateVariable.js";

/**
 * 저장된 템플릿 데이터를 편집 가능한 엔티티로 복원한다.
 *
 * 역직렬화 분기를 이 한 곳에 모으는 이유는 ElementFactory와 같다. 여러 곳에서
 * 각자 복원하면 필드를 하나 추가할 때 어딘가는 반드시 빠뜨리게 된다.
 */
export class TemplateFactory {
  /** 이 코드가 해석할 수 있는 저장 형식의 버전이다. */
  private static readonly SUPPORTED_SCHEMA_VERSION = 1;

  /** 저장 데이터를 검증한 뒤 요소와 페이지까지 갖춘 템플릿으로 복원한다. */
  static fromJSON(json: Record<string, unknown>): Template {
    TemplateFactory.assertSchemaVersion(json.schemaVersion);
    return new Template({
      id: json.id as string,
      name: json.name as string,
      version: json.version as number,
      status: json.status as TemplateStatus,
      page: TemplateFactory.readPage(json.page),
      fonts: json.fonts as readonly string[],
      variables: TemplateFactory.readVariables(json.variables),
      elements: TemplateFactory.readElements(json.elements),
      createdAt: json.createdAt as string,
      updatedAt: json.updatedAt as string,
    });
  }

  /**
   * 해석할 수 없는 형식을 조용히 열지 않고 즉시 거부한다.
   *
   * 버전이 다른 데이터를 억지로 읽으면 일부 필드만 복원된 문서가 만들어지고,
   * 그 상태로 다시 저장되면 원본을 잃는다.
   */
  private static assertSchemaVersion(value: unknown): void {
    if (value === undefined) {
      throw new Error("템플릿 저장 데이터에 schemaVersion이 없다");
    }
    if (value !== TemplateFactory.SUPPORTED_SCHEMA_VERSION) {
      throw new Error(
        `지원하지 않는 템플릿 schemaVersion ${String(value)}이다`,
      );
    }
  }

  /** 저장된 용지 설정을 규격 이름 기준으로 복원한다. */
  private static readPage(value: unknown): PageSpec {
    const json = value as Record<string, unknown>;
    return new PageSpec(
      json.size as PageSize,
      json.orientation as PageOrientation,
      json.margin as PageMargin,
    );
  }

  /**
   * 저장된 변수 목록을 종류별 클래스로 복원한다.
   *
   * 필드가 없으면 빈 목록으로 본다. 변수는 나중에 추가된 개념이므로 이렇게 하면
   * 예전 템플릿이 그대로 동작하고 schemaVersion을 올리지 않아도 된다.
   */
  private static readVariables(value: unknown): readonly TemplateVariable[] {
    if (value === undefined) return [];
    const variables = value as readonly Record<string, unknown>[];
    return variables.map((variable) => TemplateFactory.readVariable(variable));
  }

  /** 선언 하나를 복원한다. 중첩은 이름의 점 경로가 표현한다. */
  private static readVariable(json: Record<string, unknown>): TemplateVariable {
    return new TemplateVariable(
      json.name as string,
      json.label as string,
      json.type as VariableValueType,
      json.required === true,
    );
  }

  /** 저장된 요소 목록을 각 요소 클래스 인스턴스로 복원한다. */
  private static readElements(value: unknown): readonly Element[] {
    const elements = value as readonly Record<string, unknown>[];
    return elements.map((element) => ElementFactory.fromJSON(element));
  }
}
