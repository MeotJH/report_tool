/** 템플릿이 선언하는 변수가 담을 수 있는 값의 종류를 제한한다. */
export type VariableValueType =
  | "string"
  | "number"
  | "currency"
  | "date"
  | "boolean"
  | "array"
  | "image";

/**
 * 이 문서가 호스트에게 요구하는 데이터 하나를 템플릿이 직접 선언한다.
 *
 * 호스트가 제공하는 필드 목록은 "이 시스템이 줄 수 있는 값"이고, 이것은
 * "이 문서가 필요한 값"이다. 둘은 겹치지만 같지 않다. 문서가 필요한 값을
 * 문서 자신이 말할 수 없으면, 그 자리가 비어 나갔을 때 그것이 사고인지
 * 정상인지 판단할 근거가 어디에도 남지 않는다.
 *
 * 선언은 값을 만들지 않는다. 발행 시점에 호스트가 채워야 한다.
 *
 * 중첩 구조를 자식 목록으로 담지 않고 `employee.phone` 같은 점 경로 하나로
 * 표현하는 이유는, 같은 것을 두 가지 방식으로 저장하지 않기 위해서다.
 * 호스트 배열에 필드를 더하는 일과 선언 배열에 필드를 더하는 일이 같은 연산이 된다.
 */
export class TemplateVariable {
  /** 경로로 쓸 수 없는 이름을 생성 시점에 막는다. */
  constructor(
    public readonly name: string,
    public readonly label: string,
    public readonly type: VariableValueType,
    public readonly required: boolean = false,
  ) {
    TemplateVariable.assertUsableName(name);
  }

  /** 이 선언이 다른 선언의 하위 경로인지 판단한다. */
  isChildOf(parentPath: string): boolean {
    return this.name.startsWith(`${parentPath}.`);
  }

  /** 부모 경로를 지울 때 함께 사라져야 하는지 판단한다. */
  isSelfOrDescendantOf(path: string): boolean {
    return this.name === path || this.isChildOf(path);
  }

  /** 표시 이름·종류·필수 여부만 교체한 새 선언을 반환한다. */
  withDefinition(changes: Readonly<{
    label?: string;
    type?: VariableValueType;
    required?: boolean;
  }>): TemplateVariable {
    return new TemplateVariable(
      this.name,
      changes.label ?? this.label,
      changes.type ?? this.type,
      changes.required ?? this.required,
    );
  }

  /** 이름을 바꾸면 이 선언을 참조하던 경로도 함께 바뀐다. */
  withName(name: string): TemplateVariable {
    return new TemplateVariable(name, this.label, this.type, this.required);
  }

  /** 선언을 클래스 구현과 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      label: this.label,
      type: this.type,
      required: this.required,
    };
  }

  /**
   * 이름이 데이터 경로로 실제 사용 가능한지 검사한다.
   *
   * 공백이나 빈 구간이 섞인 이름은 저장은 되지만 데이터 조회가 항상 실패한다.
   * 발행된 문서에서 그 자리가 빈칸으로 나온 뒤에야 알게 되므로 여기서 거부한다.
   */
  private static assertUsableName(name: string): void {
    if (name.length === 0) {
      throw new Error("변수 이름은 비어 있을 수 없다");
    }
    if (name.includes("{") || name.includes("}")) {
      throw new Error("변수 이름에 중괄호를 쓸 수 없다");
    }
    if (/\s/.test(name)) {
      throw new Error("변수 이름에 공백을 쓸 수 없다");
    }
    if (name.split(".").some((segment) => segment.length === 0)) {
      throw new Error("변수 이름의 각 구간은 비어 있을 수 없다");
    }
  }
}
