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
 * 이 문서가 호스트에게 요구하는 데이터를 템플릿이 직접 선언한다.
 *
 * 호스트가 제공하는 필드 목록은 "이 시스템이 줄 수 있는 값"이고, 이것은
 * "이 문서가 필요한 값"이다. 둘은 겹치지만 같지 않다. 문서가 필요한 값을
 * 문서 자신이 말할 수 없으면, 그 자리가 비어 나갔을 때 그것이 사고인지
 * 정상인지 판단할 근거가 어디에도 남지 않는다.
 *
 * 선언은 값을 만들지 않는다. 발행 시점에 호스트가 채워야 한다.
 */
export class TemplateVariable {
  public readonly children: readonly TemplateVariable[];

  /** 배열 변수의 자식 목록을 외부 배열 변경에서 보호해 보존한다. */
  constructor(
    public readonly name: string,
    public readonly label: string,
    public readonly type: VariableValueType,
    public readonly required: boolean = false,
    children: readonly TemplateVariable[] = [],
  ) {
    if (name.length === 0) {
      throw new Error("변수 이름은 비어 있을 수 없다");
    }
    if (name.includes("{") || name.includes("}")) {
      throw new Error("변수 이름에 중괄호를 쓸 수 없다");
    }
    this.children = [...children];
    if (type !== "array" && this.children.length > 0) {
      throw new Error("배열이 아닌 변수는 자식 변수를 가질 수 없다");
    }
  }

  /** 배열 변수의 자식 구성만 교체한 새 변수를 반환한다. */
  withChildren(children: readonly TemplateVariable[]): TemplateVariable {
    return new TemplateVariable(this.name, this.label, this.type, this.required, children);
  }

  /** 표시 이름과 필수 여부 같은 표현 설정만 교체한 새 변수를 반환한다. */
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
      this.children,
    );
  }

  /** 선언을 클래스 구현과 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      label: this.label,
      type: this.type,
      required: this.required,
      children: this.children.map((child) => child.toJSON()),
    };
  }
}
