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
 * 템플릿이 스스로 소유하는 변수를 표현한다.
 *
 * 호스트가 제공하는 필드 목록은 "이 시스템이 줄 수 있는 값"이고, 이것은
 * "이 문서가 필요한 값"이다. 둘은 겹치지만 같지 않다. 문서가 필요한 값을
 * 문서 자신이 말할 수 없으면, 데이터가 비었을 때 그것이 사고인지 정상인지
 * 판단할 근거가 어디에도 남지 않는다.
 */
export abstract class TemplateVariable {
  /** 변수 이름이 데이터 경로 조회를 깨뜨리지 않는지 생성 시점에 확인한다. */
  constructor(
    public readonly name: string,
    public readonly label: string,
  ) {
    if (name.length === 0) {
      throw new Error("변수 이름은 비어 있을 수 없다");
    }
    if (name.includes("{") || name.includes("}")) {
      throw new Error("변수 이름에 중괄호를 쓸 수 없다");
    }
  }

  /** 저장 형식과 화면이 변수 종류를 같은 값으로 구분하게 한다. */
  public abstract readonly kind: "constant" | "data";

  /** 요소가 이 변수를 참조할 때 사용하는 데이터 경로를 제공한다. */
  abstract path(): string;

  /** 변수 정의를 클래스 구현과 무관한 저장 데이터로 변환한다. */
  abstract toJSON(): Record<string, unknown>;
}

/**
 * 모든 발행본에서 같은 값으로 나가는 문구를 템플릿 안에 한 번만 적어 둔다.
 *
 * 회사명이나 문의처를 텍스트 요소마다 직접 입력하면, 값이 바뀔 때 문서에서
 * 몇 군데에 적었는지부터 찾아야 한다.
 */
export class ConstantVariable extends TemplateVariable {
  /** 상수를 참조할 때 쓰는 예약 이름공간이다. */
  public static readonly NAMESPACE = "const";

  /** 경로 조회와 표현식 치환이 모두 다룰 수 있는 이름만 허용한다. */
  private static readonly NAME_PATTERN = /^[\p{L}\p{N}_]+$/u;
  public readonly kind = "constant" as const;

  /**
   * 상수는 이름과 값만 갖는다.
   *
   * 표시 이름을 따로 두지 않는 이유는, 사용자가 문서에서 참조할 때 쓰는 이름이
   * 그대로 사람이 읽는 이름이기 때문이다. 두 개를 두면 어느 쪽을 고쳐야 하는지가
   * 매번 모호해진다.
   */
  constructor(name: string, public readonly value: string) {
    super(name, name);
    if (!ConstantVariable.NAME_PATTERN.test(name)) {
      throw new Error("상수 이름에는 글자·숫자·밑줄만 쓸 수 있다");
    }
  }

  /** 상수는 예약 이름공간 아래에서 조회된다. */
  path(): string {
    return `${ConstantVariable.NAMESPACE}.${this.name}`;
  }

  /** 값만 교체한 새 상수를 반환해 편집을 불변 연산으로 만든다. */
  withValue(value: string): ConstantVariable {
    return new ConstantVariable(this.name, value);
  }

  /** 이름을 바꾸면 참조 경로도 함께 바뀐다. */
  withName(name: string): ConstantVariable {
    return new ConstantVariable(name, this.value);
  }

  /** 상수 정의를 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      kind: this.kind,
      name: this.name,
      value: this.value,
    };
  }
}

/**
 * 이 문서가 호스트에게 요구하는 데이터를 템플릿이 직접 선언한다.
 *
 * 선언은 값을 만들지 않는다. 발행 시점에 호스트가 채워야 하며, 채우지 못하면
 * 검증이 그것을 오류로 드러낸다. 선언이 없으면 같은 빈칸이 조용히 발행된다.
 */
export class DataVariable extends TemplateVariable {
  public readonly kind = "data" as const;
  public readonly children: readonly DataVariable[];

  /** 배열 변수의 자식 목록을 외부 배열 변경에서 보호해 보존한다. */
  constructor(
    name: string,
    label: string,
    public readonly type: VariableValueType,
    public readonly required: boolean = false,
    children: readonly DataVariable[] = [],
  ) {
    super(name, label);
    this.children = [...children];
    if (type !== "array" && this.children.length > 0) {
      throw new Error("배열이 아닌 변수는 자식 변수를 가질 수 없다");
    }
  }

  /** 선언한 이름이 그대로 데이터 조회 경로가 된다. */
  path(): string {
    return this.name;
  }

  /** 배열 변수의 자식 구성만 교체한 새 변수를 반환한다. */
  withChildren(children: readonly DataVariable[]): DataVariable {
    return new DataVariable(this.name, this.label, this.type, this.required, children);
  }

  /** 표시 이름과 필수 여부 같은 표현 설정만 교체한 새 변수를 반환한다. */
  withDefinition(changes: Readonly<{
    label?: string;
    type?: VariableValueType;
    required?: boolean;
  }>): DataVariable {
    return new DataVariable(
      this.name,
      changes.label ?? this.label,
      changes.type ?? this.type,
      changes.required ?? this.required,
      this.children,
    );
  }

  /** 선언을 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      kind: this.kind,
      name: this.name,
      label: this.label,
      type: this.type,
      required: this.required,
      children: this.children.map((child) => child.toJSON()),
    };
  }
}
