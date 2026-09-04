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
 * 선언에 덧붙는 것들이다.
 *
 * 위치 인자로 계속 늘리지 않는다. `new TemplateVariable(name, label, type, true, "1500000")`
 * 같은 호출은 다섯 번째 값이 무엇인지 읽는 사람이 알 수 없다.
 */
export interface TemplateVariableOptions {
  /**
   * 편집기 미리보기에서 이 자리에 보여 줄 예시다.
   *
   * 호스트가 준 샘플 데이터에 이 경로가 없을 때만 쓴다. 방금 선언한 변수를
   * 배치하면 미리보기가 빈칸이 되는데, 그러면 글자 크기도 넘침도 확인할 수 없다.
   * **발행에는 절대 쓰이지 않는다** — 발행 데이터는 호스트가 준 것뿐이다.
   */
  readonly sample?: string;

  /**
   * 이 값이 밖으로 나가면 안 되는 종류인지 표시한다.
   *
   * 주민등록번호·계좌번호가 평문으로 발행되는 경로를 막으려고 둔다. 표시 자체가
   * 값을 가리지는 않는다 — 배치할 때 마스킹을 기본으로 걸고, 팔레트에 자물쇠를
   * 보여 담당자가 알아채게 한다. **가리는 판단은 양식이 하고, 데이터는 호스트
   * 안에 그대로 남는다.**
   */
  readonly sensitive?: boolean;
}

/**
 * 이 문서가 발행 시 요구하는 데이터 하나를 템플릿이 직접 선언한다.
 *
 * 이 선언이 문서가 필요로 하는 값의 유일한 근거다. 문서가 필요한 값을
 * 문서 자신이 말할 수 없으면, 그 자리가 비어 나갔을 때 그것이 사고인지
 * 정상인지 판단할 근거가 어디에도 남지 않는다.
 *
 * 선언은 값을 만들지 않는다. 발행 시점에 호스트가 채워야 한다.
 *
 * 중첩 구조를 자식 목록으로 담지 않고 `employee.phone` 같은 점 경로 하나로
 * 표현하는 이유는, 같은 것을 두 가지 방식으로 저장하지 않기 위해서다.
 * 배열에 필드를 더하는 일이 최상위에 필드를 더하는 일과 같은 연산이 된다.
 */
export class TemplateVariable {
  /**
   * 미리보기에 쓸 예시다. 정하지 않았으면 `null`이다.
   *
   * 빈 문자열과 `null`을 구분한다. 빈 문자열은 "예시가 비어 있다", `null`은
   * "정하지 않았다"는 뜻이고, 채울 자리와 비워 둘 자리가 갈린다.
   */
  public readonly sample: string | null;

  /** 민감한 값인지 여부다. 적지 않았으면 아니다. */
  public readonly sensitive: boolean;

  /** 경로로 쓸 수 없는 이름을 생성 시점에 막는다. */
  constructor(
    public readonly name: string,
    public readonly label: string,
    public readonly type: VariableValueType,
    public readonly required: boolean = false,
    options: TemplateVariableOptions = {},
  ) {
    TemplateVariable.assertUsableName(name);
    this.sample = options.sample ?? null;
    this.sensitive = options.sensitive ?? false;
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
    sample?: string | null;
    sensitive?: boolean;
  }>): TemplateVariable {
    return new TemplateVariable(
      this.name,
      changes.label ?? this.label,
      changes.type ?? this.type,
      changes.required ?? this.required,
      this.optionsWith(changes.sample, changes.sensitive),
    );
  }

  /** 이름을 바꾸면 이 선언을 참조하던 경로도 함께 바뀐다. */
  withName(name: string): TemplateVariable {
    return new TemplateVariable(name, this.label, this.type, this.required, this.optionsWith());
  }

  /**
   * 덧붙은 것들을 그대로 옮긴다. 바꿀 것만 인자로 받는다.
   *
   * `undefined`(안 바꿈)와 `null`(지움)을 구분해야 해서 `??`로는 부족하다.
   */
  private optionsWith(
    sample?: string | null,
    sensitive?: boolean,
  ): TemplateVariableOptions {
    const nextSample = sample === undefined ? this.sample : sample;
    const nextSensitive = sensitive ?? this.sensitive;
    return {
      ...(nextSample === null ? {} : { sample: nextSample }),
      ...(nextSensitive ? { sensitive: true } : {}),
    };
  }

  /**
   * 선언을 클래스 구현과 무관한 저장 데이터로 변환한다.
   *
   * 정하지 않은 예시는 아예 적지 않는다. `"sample": null`을 남기면 예시 기능이
   * 생기기 전에 저장된 문서가 열었다 닫기만 해도 달라진다 — 그러면 변경 이력에서
   * 실제 편집과 형식 변화를 구분할 수 없다.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      label: this.label,
      type: this.type,
      required: this.required,
      ...(this.sample === null ? {} : { sample: this.sample }),
      ...(this.sensitive ? { sensitive: true } : {}),
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
