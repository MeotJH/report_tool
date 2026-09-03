import { TemplateVariable, type VariableValueType } from "./TemplateVariable.js";

/**
 * 발행에 쓸 샘플 데이터를 보고 이 문서가 요구하는 값 선언을 만든다.
 *
 * 선언을 손으로 하나씩 넣게 두면 백지에서 시작할 수 없다. 월간 리포트는 배열
 * 다섯 개에 자식 서른여섯 개다 — 대화상자를 마흔여섯 번 지나야 표 하나를 데이터에
 * 연결할 수 있고, 그 사이 한 글자만 틀려도 그 칸만 빈칸으로 발행된다.
 *
 * 그런데 호스트는 이미 그 모양을 알고 있다. 미리보기에 쓰는 샘플이 곧 발행 데이터의
 * 모양이기 때문이다. 그러므로 사람이 다시 받아쓸 일이 아니라 읽어 내면 되는 일이다.
 *
 * 추측하지 않는 것도 정한다. **표시 이름은 경로의 마지막 구간을 그대로 쓴다.**
 * `requested`를 `총요청건수`로 바꿔 주는 것은 이 클래스가 할 수 없는 판단이고,
 * 틀리게 지어 주면 사람이 고친 것과 구별되지 않는다. 이름은 사람이 고친다.
 */
export class VariableInference {
  /** 한 배열의 모양을 정하는 데 쓸 행 수다. 첫 행만 보면 비어 있는 칸을 놓친다. */
  private static readonly ROWS_TO_SCAN = 20;

  /** 샘플 하나에서 선언 목록을 만든다. 부모가 자식보다 먼저 온다. */
  infer(sample: unknown): readonly TemplateVariable[] {
    if (!VariableInference.isRecord(sample)) return [];
    return this.fromRecord(sample, "");
  }

  /** 객체 한 겹을 훑어 선언을 만들고, 안쪽이 또 객체면 경로를 이어 내려간다. */
  private fromRecord(
    record: Readonly<Record<string, unknown>>,
    prefix: string,
  ): readonly TemplateVariable[] {
    return Object.entries(record).flatMap(([key, value]) => (
      this.fromEntry(VariableInference.join(prefix, key), value)
    ));
  }

  /** 값의 모양에 따라 배열·중첩 객체·단일 값 중 하나로 다룬다. */
  private fromEntry(path: string, value: unknown): readonly TemplateVariable[] {
    if (Array.isArray(value)) return this.fromArray(path, value);
    if (VariableInference.isRecord(value)) return this.fromRecord(value, path);
    return [this.declare(path, VariableInference.typeOf(value))];
  }

  /**
   * 배열은 자기 자신과 한 줄의 구성을 함께 선언한다.
   *
   * 자식 순서는 데이터에 나온 순서를 지킨다 — 그 순서가 표의 열 순서가 되고,
   * 사람이 화면에서 보고 있는 원본의 열 순서와 같아야 옮겨 적을 수 있다.
   */
  private fromArray(path: string, rows: readonly unknown[]): readonly TemplateVariable[] {
    const declaration = this.declare(path, "array");
    const children = this.arrayChildKeys(rows).map((key) => (
      this.declare(VariableInference.join(path, key), this.childType(rows, key))
    ));
    return [declaration, ...children];
  }

  /**
   * 여러 행을 훑어 한 줄이 가질 수 있는 키를 모두 모은다.
   *
   * 첫 행만 보면 그 행에서 비어 있던 칸이 열에서 빠진다. 스물세 건짜리 표에서
   * 첫 건에만 없는 값이 있으면 그 열이 통째로 사라진다.
   */
  private arrayChildKeys(rows: readonly unknown[]): readonly string[] {
    const keys: string[] = [];
    for (const row of rows.slice(0, VariableInference.ROWS_TO_SCAN)) {
      if (!VariableInference.isRecord(row)) continue;
      for (const key of Object.keys(row)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys;
  }

  /** 어느 행에든 값이 있으면 그 값으로 종류를 정한다. 전부 비었으면 문자로 둔다. */
  private childType(rows: readonly unknown[], key: string): VariableValueType {
    for (const row of rows.slice(0, VariableInference.ROWS_TO_SCAN)) {
      if (!VariableInference.isRecord(row)) continue;
      const value = row[key];
      if (value === undefined || value === null || value === "") continue;
      return VariableInference.typeOf(value);
    }
    return "string";
  }

  /** 표시 이름은 경로의 마지막 구간을 그대로 쓴다. 짐작해서 지어 주지 않는다. */
  private declare(path: string, type: VariableValueType): TemplateVariable {
    const segments = path.split(".");
    return new TemplateVariable(path, segments[segments.length - 1] ?? path, type);
  }

  /** 빈 접두사에 점이 붙어 `.name` 같은 경로가 생기지 않게 한다. */
  private static join(prefix: string, key: string): string {
    return prefix === "" ? key : `${prefix}.${key}`;
  }

  /**
   * 값 하나의 종류를 정한다.
   *
   * 금액과 날짜는 짐작하지 않는다. `4200000`이 금액인지 건수인지, `2026-07-01`이
   * 날짜인지 문자인지는 데이터 모양만으로 갈리지 않는다. 틀린 종류는 표시 형식을
   * 바꿔 버리므로, 확실한 것만 정하고 나머지는 사람이 고르게 둔다.
   */
  private static typeOf(value: unknown): VariableValueType {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "string";
  }

  /** 배열도 null도 아닌 순수 객체만 안쪽을 훑는다. */
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
