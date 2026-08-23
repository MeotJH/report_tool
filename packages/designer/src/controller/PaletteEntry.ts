import type {
  FieldSchema,
  TemplateVariable,
  VariableValueType,
} from "@report-tool/core";

/** 팔레트 한 줄이 어디서 왔는지 구분해 사용자가 신뢰도를 판단하게 한다. */
export type PaletteOrigin = "host" | "declared";

/**
 * 데이터 패널 한 줄이 필요한 모든 정보를 담은다.
 *
 * 호스트가 준 스키마와 템플릿이 선언한 변수를 같은 모양으로 다뤄야 팔레트·드래그·
 * 표 열 구성이 출처를 신경 쓰지 않고 동작한다. 출처는 표시와 검증에만 쓴다.
 */
export interface PaletteEntry {
  readonly path: string;
  readonly label: string;
  readonly type: VariableValueType;
  readonly origin: PaletteOrigin;
  readonly sensitive: boolean;
  readonly children: readonly PaletteEntry[];
  /** 배열 자식이면 소속 배열의 경로. 최상위 항목은 null이다. */
  readonly arrayPath: string | null;
}

/**
 * 호스트가 제공한 필드와 템플릿이 선언한 변수를 한 목록으로 합친다.
 *
 * 두 출처를 화면에서 따로 관리하면 같은 경로가 양쪽에 있을 때 어느 쪽이 실제로
 * 쓰이는지 알 수 없다. 합치는 규칙을 한곳에 두고, 호스트가 실제로 값을 주는
 * 경로를 우선한다.
 */
export class PaletteEntryBuilder {
  /** 호스트 필드 뒤에 템플릿이 선언한 변수를 이어 한 목록을 만든다. */
  build(
    hostFields: FieldSchema,
    variables: readonly TemplateVariable[],
  ): readonly PaletteEntry[] {
    const hostEntries = this.fromSchema(hostFields, "", null);
    const claimed = new Set(this.collectPaths(hostEntries));
    const declared = variables
      .filter((variable) => !claimed.has(variable.name))
      .map((variable) => this.fromVariable(variable, "", null));
    return [...hostEntries, ...declared];
  }

  /** 호스트 스키마를 경로와 소속 배열을 보존하며 재귀적으로 변환한다. */
  private fromSchema(
    fields: FieldSchema,
    parentPath: string,
    arrayPath: string | null,
  ): readonly PaletteEntry[] {
    return Object.entries(fields).map(([key, specification]) => {
      const path = this.joinPath(parentPath, key);
      const children = specification.children === undefined
        ? []
        : this.fromSchema(specification.children, path, path);
      return {
        path,
        label: specification.label,
        type: specification.type,
        origin: "host" as const,
        sensitive: specification.sensitive === true,
        children,
        arrayPath,
      };
    });
  }

  /**
   * 템플릿이 선언한 데이터 변수를 자식까지 함께 변환한다.
   *
   * 자식 변수의 이름은 배열 한 줄 안의 키이므로, 호스트 스키마와 같은 규칙으로
   * 부모 경로를 앞에 붙여야 팔레트에서 끌어 놓을 때 같은 경로 체계를 쓴다.
   */
  private fromVariable(
    variable: TemplateVariable,
    parentPath: string,
    arrayPath: string | null,
  ): PaletteEntry {
    const path = this.joinPath(parentPath, variable.name);
    return {
      path,
      label: variable.label,
      type: variable.type,
      origin: "declared",
      sensitive: false,
      children: variable.children.map(
        (child) => this.fromVariable(child, path, path),
      ),
      arrayPath,
    };
  }

  /** 호스트가 이미 제공하는 경로를 중복 표시하지 않도록 모두 모은다. */
  private collectPaths(entries: readonly PaletteEntry[]): readonly string[] {
    return entries.flatMap((entry) => [entry.path, ...this.collectPaths(entry.children)]);
  }

  /** 중첩 키를 바인딩이 사용하는 점 표기 경로로 결합한다. */
  private joinPath(parentPath: string, key: string): string {
    if (parentPath === "" || key.includes(".")) return key;
    return `${parentPath}.${key}`;
  }
}
