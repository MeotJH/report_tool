import { TemplateReferences, type Template, type TemplateVariable } from "@report-tool/core";

/** 양식이 요구하는 데이터 경로 하나다. */
export interface ContractEntry {
  readonly path: string;
  readonly label: string;
  readonly type: string;
  /** 문서 어딘가에서 실제로 그려지는 경로인가. */
  readonly used: boolean;
  /** 선언 목록에 있는가. 없으면 문서만 쓰고 있는 것이다. */
  readonly declared: boolean;
  /** 호스트가 준 샘플에 값이 있는가. 없으면 지금 발행하면 빈칸이다. */
  readonly inSample: boolean;
  readonly required: boolean;
  readonly sensitive: boolean;
}

/** 양식 하나가 호스트에게 요구하는 것 전부다. */
export interface TemplateContract {
  readonly templateId: string;
  readonly version: number;
  readonly entries: readonly ContractEntry[];
  /** 붙여넣고 값만 채우면 되는 빈 껍데기다. */
  readonly sample: Record<string, unknown>;
}

/**
 * 양식이 어떤 데이터를 요구하는지 계산한다.
 *
 * 목록이 셋인데 서로 어긋난다는 것이 문제다 — **선언한 변수**, **문서가 실제로
 * 그리는 경로**, **호스트가 주는 데이터**. 셋을 한자리에서 맞춰 보지 않으면
 * 어긋남이 "발행본의 그 칸만 빈칸"으로만 드러나고, 오류도 로그도 남지 않는다.
 * 급여명세서의 실지급액이 빈칸으로 직원에게 나가는 사고가 그렇게 난다.
 *
 * 특히 **양식이 바뀌었을 때 호스트 백엔드가 무엇을 더 줘야 하는지** 알 방법이
 * 지금 없다. 양식을 만드는 사람과 데이터를 주는 사람은 보통 다른 팀이고 서로
 * 말하지 않고 일한다. 그 사이를 사람의 기억이 아니라 양식 자신이 이어야 한다.
 *
 * **계산은 라이브러리의 `TemplateReferences`에 맡긴다.** 경로가 숨는 자리가
 * 다섯 군데(필드 바인딩·표 Source·표 셀 문구·이미지 출처·데이터 문구)라서,
 * 호스트가 직접 뒤지면 요소 종류가 하나 늘 때마다 빠뜨린다.
 */
export class TemplateContractReader {
  private readonly references = new TemplateReferences();

  /** 양식과 호스트 샘플을 맞춰 계약을 만든다. */
  read(template: Template, sampleData: unknown): TemplateContract {
    const used = new Set(this.references.collect(template).map((one) => one.path));
    const entries = this.merge(template.variables, used).map((entry) => ({
      ...entry,
      inSample: this.has(sampleData, entry.path),
      // 선언이 없으면 종류를 알 길이 없다. 샘플에 값이 있으면 그것을 근거로
      // 삼는다. **틀린 안내는 없느니만 못하다** — 배열인 자리를 `""`라고 알려
      // 주면 백엔드는 그대로 만들고, 표가 통째로 빈 채 발행된다.
      type: entry.declared ? entry.type : this.inferType(sampleData, entry.path),
    }));
    return {
      templateId: template.id,
      version: template.version,
      entries,
      sample: this.emptyShape(entries, sampleData),
    };
  }

  /**
   * 선언 목록과 실제 사용 경로를 하나로 합친다.
   *
   * 양쪽 어디에도 빠뜨리지 않는다. 선언만 있는 것은 지워도 되는 것이고, 사용만
   * 되는 것은 **선언을 빠뜨린 것**이라 더 위험하다.
   */
  private merge(
    variables: readonly TemplateVariable[],
    used: ReadonlySet<string>,
  ): ContractEntry[] {
    // 쓰이는 배열의 자식 선언은 자기가 직접 참조되지 않아도 필요하다. 표의 열이
    // `row.amount`를 가리키면 문서가 참조하는 경로는 배열 하나뿐이지만, 호스트는
    // 그 행 안에 `amount`를 담아 줘야 한다.
    const usedArrays = variables
      .filter((variable) => variable.type === "array" && used.has(variable.name))
      .map((variable) => variable.name);
    // 형을 못 박아 둔다. 추론에 맡기면 `type`이 `VariableValueType`으로 좁혀지고,
    // 선언 없는 경로에 쓸 `"unknown"`을 담을 수 없게 된다.
    const entries: ContractEntry[] = variables.map((variable) => ({
      path: variable.name,
      label: variable.label,
      type: variable.type as string,
      used: used.has(variable.name)
        || this.hasUsedChild(variable.name, used)
        || usedArrays.some((array) => variable.name.startsWith(`${array}.`)),
      declared: true,
      inSample: false,
      required: variable.required,
      sensitive: variable.sensitive,
    }));
    const declared = new Set(variables.map((variable) => variable.name));
    for (const path of used) {
      if (declared.has(path) || this.isChildOfDeclared(path, declared)) continue;
      entries.push({
        path, label: path, type: "unknown",
        used: true, declared: false, inSample: false,
        required: false, sensitive: false,
      });
    }
    return entries.sort((first, second) => first.path.localeCompare(second.path));
  }

  /**
   * 배열 선언은 자식이 쓰이면 자기도 쓰인 것이다.
   *
   * `payments`를 표로 놓으면 문서가 참조하는 경로는 `payments`지만, 열이
   * `payments.amount`를 가리킬 수도 있다. 어느 쪽이든 그 배열은 필요하다.
   */
  private hasUsedChild(path: string, used: ReadonlySet<string>): boolean {
    for (const one of used) {
      if (one.startsWith(`${path}.`)) return true;
    }
    return false;
  }

  /** 표 열이 참조하는 `payments.amount`를 별도 항목으로 또 만들지 않는다. */
  private isChildOfDeclared(path: string, declared: ReadonlySet<string>): boolean {
    const separator = path.lastIndexOf(".");
    return separator !== -1 && declared.has(path.slice(0, separator));
  }

  /**
   * 샘플에 있는 값의 모양으로 종류를 짐작한다.
   *
   * 샘플에도 없으면 `unknown`이다. 아무 값이나 찍어 주면 읽는 사람은 그것이
   * 근거인 줄 안다.
   */
  private inferType(data: unknown, path: string): string {
    const value = this.valueAt(data, path);
    if (value === undefined) return "unknown";
    if (Array.isArray(value)) return "array";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "string";
  }

  /** 그 경로의 값을 꺼낸다. 없으면 `undefined`다. */
  private valueAt(data: unknown, path: string): unknown {
    let cursor: unknown = data;
    for (const segment of path.split(".")) {
      const target = Array.isArray(cursor) ? cursor[0] : cursor;
      if (typeof target !== "object" || target === null) return undefined;
      cursor = (target as Record<string, unknown>)[segment];
    }
    return cursor;
  }

  /** 그 경로에 값이 실제로 있는지 본다. 빈 문자열도 값으로 친다. */
  private has(data: unknown, path: string): boolean {
    let cursor: unknown = data;
    for (const segment of path.split(".")) {
      if (typeof cursor !== "object" || cursor === null) return false;
      // 배열은 첫 행을 대표로 본다. 행마다 모양이 다르면 그것은 데이터 쪽 문제다.
      const target = Array.isArray(cursor) ? cursor[0] : cursor;
      if (typeof target !== "object" || target === null) return false;
      if (!(segment in (target as Record<string, unknown>))) return false;
      cursor = (target as Record<string, unknown>)[segment];
    }
    return cursor !== undefined && cursor !== null;
  }

  /**
   * 붙여넣고 값만 채우면 되는 빈 껍데기를 만든다.
   *
   * 백엔드 개발자가 읽는 것이 이것이다. 양식 JSON 600줄을 뜯어 경로를 찾아내는
   * 대신, 이것을 복사해 값을 채우면 된다.
   */
  private emptyShape(
    entries: readonly ContractEntry[],
    sampleData: unknown,
  ): Record<string, unknown> {
    const shape: Record<string, unknown> = {};
    for (const entry of entries) {
      if (!entry.used) continue;
      this.put(shape, entry.path.split("."), this.leafFor(entry, sampleData));
    }
    return shape;
  }

  /**
   * 그 경로에 넣을 빈 값을 정한다.
   *
   * 배열은 첫 행의 열쇠까지 보여 준다. `[]`만 주면 행 안에 무엇을 담아야 하는지
   * 여전히 알 수 없다. 종류를 모르는 자리는 `null`로 두어 "여기는 우리도 모른다"를
   * 드러낸다.
   */
  private leafFor(entry: ContractEntry, sampleData: unknown): unknown {
    if (entry.type === "unknown") return null;
    if (entry.type !== "array") return "";
    const rows = this.valueAt(sampleData, entry.path);
    const first = Array.isArray(rows) ? rows[0] : undefined;
    if (typeof first !== "object" || first === null) return [{}];
    return [Object.fromEntries(Object.keys(first).map((key) => [key, ""]))];
  }

  /** 점 경로를 따라 내려가며 빈 값을 놓는다. 배열이면 첫 행 안에 놓는다. */
  private put(target: Record<string, unknown>, path: readonly string[], leaf: unknown): void {
    const [head, ...rest] = path;
    if (head === undefined) return;
    if (rest.length === 0) {
      if (target[head] === undefined) target[head] = leaf;
      return;
    }
    const existing = target[head];
    if (Array.isArray(existing)) {
      const first = (existing[0] ?? {}) as Record<string, unknown>;
      this.put(first, rest, leaf);
      existing[0] = first;
      return;
    }
    const next = (typeof existing === "object" && existing !== null
      ? existing
      : {}) as Record<string, unknown>;
    target[head] = next;
    this.put(next, rest, leaf);
  }
}
