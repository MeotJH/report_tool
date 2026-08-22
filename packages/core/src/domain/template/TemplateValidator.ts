import { FieldElement } from "../element/FieldElement.js";
import { TableElement } from "../element/TableElement.js";
import { BoundTableSource } from "../element/TableSource.js";
import { Template } from "./Template.js";

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
  /** 여러 구조 오류를 한 번에 고칠 수 있도록 가능한 오류를 모두 수집한다. */
  validate(template: Template): ValidationError[] {
    const elements = template.getElements();
    const errors: ValidationError[] = [];

    if (elements.length === 0) {
      errors.push(new ValidationError(null, "요소가 하나도 없다"));
    }

    errors.push(...this.findDuplicateIdErrors(template));
    errors.push(...this.findEmptyBindingErrors(template));
    return errors;
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
