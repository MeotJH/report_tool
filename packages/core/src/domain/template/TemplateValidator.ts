import type { Element } from "../element/Element.js";
import { FieldElement } from "../element/FieldElement.js";
import { TableElement } from "../element/TableElement.js";
import { BoundTableSource } from "../element/TableSource.js";
import { Template } from "./Template.js";
import { KoreanParticle } from "./KoreanParticle.js";
import { TemplateReferences } from "./TemplateReferences.js";
import { ConstantVariable } from "./TemplateVariable.js";

/**
 * 템플릿의 구조적 결함을 요소 위치와 함께 전달해 편집 화면에서 원인을 표시하게 한다.
 */
export class ValidationError {
  /** 전체 템플릿 오류와 특정 요소 오류를 같은 결과 목록에 담는다. */
  constructor(
    public readonly elementId: string | null,
    public readonly message: string,
  ) {}
}

/**
 * 발행 전에 템플릿 자체가 보장해야 하는 최소 구조 규칙을 한곳에서 검사한다.
 */
export class TemplateValidator {
  private readonly references = new TemplateReferences();

  /** 여러 구조 오류를 한 번에 고칠 수 있도록 가능한 오류를 모두 수집한다. */
  validate(template: Template): ValidationError[] {
    const elements = template.getElements();
    const errors: ValidationError[] = [];

    if (elements.length === 0) {
      errors.push(new ValidationError(null, "요소가 하나도 없다"));
    }

    errors.push(...this.findDuplicateIdErrors(template));
    errors.push(...this.findEmptyBindingErrors(template));
    errors.push(...this.findDuplicateVariableErrors(template));
    errors.push(...this.findUndeclaredConstantErrors(template));
    return errors;
  }

  /** 같은 이름의 변수가 둘 있으면 어느 값이 나갈지 정할 수 없다. */
  private findDuplicateVariableErrors(template: Template): ValidationError[] {
    const counts = new Map<string, number>();
    for (const variable of template.variables) {
      counts.set(variable.name, (counts.get(variable.name) ?? 0) + 1);
    }
    return [...counts]
      .filter(([, count]) => count > 1)
      .map(([name]) => new ValidationError(
        null,
        `변수 이름 ${KoreanParticle.subjectOf(name)} 중복되었다`,
      ));
  }

  /**
   * 선언되지 않은 상수를 참조하는 요소를 찾는다.
   *
   * 상수는 템플릿 안에서만 값을 얻으므로, 선언이 없으면 호스트가 어떤 데이터를
   * 줘도 그 자리는 영구히 빈칸이다. 발행 전에 반드시 드러나야 한다.
   */
  private findUndeclaredConstantErrors(template: Template): ValidationError[] {
    const declared = new Set(template.variables
      .filter((variable) => variable.kind === "constant")
      .map((variable) => variable.name));
    return template.getElements().flatMap((element) => this
      .constantNamesIn(element)
      .filter((name) => !declared.has(name))
      .map((name) => new ValidationError(
        element.id,
        `선언되지 않은 상수 ${KoreanParticle.objectOf(name)} 참조한다`,
      )));
  }

  /** 요소가 문구와 바인딩에서 참조한 상수 이름을 모두 모은다. */
  private constantNamesIn(element: Element): readonly string[] {
    const prefix = `${ConstantVariable.NAMESPACE}.`;
    return [...new Set(this.references
      .pathsOf(element)
      .filter((path) => path.startsWith(prefix))
      .map((path) => path.slice(prefix.length).split(".")[0] ?? ""))]
      .filter((name) => name.length > 0);
  }

  /** 같은 id를 가진 모든 요소를 표시해 사용자가 충돌 대상을 빠짐없이 찾게 한다. */
  private findDuplicateIdErrors(template: Template): ValidationError[] {
    const elements = template.getElements();
    const counts = new Map<string, number>();
    for (const element of elements) {
      counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    }

    return elements
      .filter((element) => (counts.get(element.id) ?? 0) > 1)
      .map((element) => new ValidationError(
        element.id,
        `요소 id ${element.id}가 중복되었다`,
      ));
  }

  /** 데이터 요소가 저장 경로 없이 발행되는 것을 템플릿 경계에서 방어한다. */
  private findEmptyBindingErrors(template: Template): ValidationError[] {
    return template.getElements()
      .filter((element) => this.hasEmptyBinding(element))
      .map((element) => new ValidationError(
        element.id,
        "데이터 바인딩 경로가 비어 있다",
      ));
  }

  /** 데이터 출처가 있는 요소만 각자의 Binding 위치에서 빈 경로를 검사한다. */
  private hasEmptyBinding(element: unknown): boolean {
    if (element instanceof FieldElement) {
      return element.binding.path.toString().length === 0;
    }
    if (element instanceof TableElement && element.source instanceof BoundTableSource) {
      return element.source.binding.path.toString().length === 0;
    }
    return false;
  }
}
