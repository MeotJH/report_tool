import type { TemplateVariable, VariableValueType } from "@report-tool/core";

/**
 * 데이터 패널 한 줄이 필요한 모든 정보를 담는다.
 *
 * 템플릿이 선언한 변수는 평평한 점 경로로 저장되지만, 화면과 드래그·표 열 구성은
 * 소속 관계를 알아야 한다. 그 관계를 여기서 한 번만 계산해 모든 화면이 공유한다.
 */
export interface PaletteEntry {
  readonly path: string;
  readonly label: string;
  readonly type: VariableValueType;
  readonly children: readonly PaletteEntry[];
  /** 밖으로 나가면 안 되는 값인지. 배치할 때 마스킹을 기본으로 걸 근거다. */
  readonly sensitive: boolean;
  /** 배열 자식이면 소속 배열의 경로. 최상위 항목은 null이다. */
  readonly arrayPath: string | null;
}

/**
 * 템플릿이 선언한 변수 목록을 화면이 그릴 수 있는 트리로 바꾼다.
 *
 * 선언은 `employee.phone` 같은 점 경로 하나로 저장한다. 저장은 평평하게 두고
 * 트리는 여기서만 만드는 이유는, 같은 소속 관계를 두 곳에 저장하면 둘이 어긋날 때
 * 어느 쪽이 옳은지 판단할 근거가 없어지기 때문이다.
 */
export class PaletteEntryBuilder {
  /** 선언 목록을 부모가 자식보다 먼저 존재하는 트리로 만든다. */
  build(variables: readonly TemplateVariable[]): readonly PaletteEntry[] {
    return this.sortByDepth(variables)
      .map((variable) => this.fromVariable(variable))
      .reduce<readonly PaletteEntry[]>(
        (entries, entry) => this.attach(entries, entry),
        [],
      );
  }

  /** 같은 경로가 이미 있으면 덧붙이지 않아 목록에 중복이 생기지 않게 한다. */
  private attach(
    entries: readonly PaletteEntry[],
    declared: PaletteEntry,
  ): readonly PaletteEntry[] {
    if (this.collectPaths(entries).includes(declared.path)) return entries;
    const parentPath = this.parentPathOf(declared.path);
    if (parentPath === null) return [...entries, declared];
    const attached = this.attachToParent(entries, parentPath, declared);
    return attached ?? [...entries, declared];
  }

  /**
   * 부모 경로를 가진 항목을 찾아 그 자식으로 넣는다.
   *
   * 부모를 찾지 못하면 null을 반환해 호출부가 최상위로 두게 한다. 부모가 없다고
   * 선언을 버리면 사용자가 방금 만든 항목이 화면에서 사라진다.
   */
  private attachToParent(
    entries: readonly PaletteEntry[],
    parentPath: string,
    declared: PaletteEntry,
  ): readonly PaletteEntry[] | null {
    let changed = false;
    const next = entries.map((entry) => {
      if (entry.path === parentPath) {
        changed = true;
        return {
          ...entry,
          children: [...entry.children, { ...declared, arrayPath: entry.path }],
        };
      }
      const children = this.attachToParent(entry.children, parentPath, declared);
      if (children === null) return entry;
      changed = true;
      return { ...entry, children };
    });
    return changed ? next : null;
  }

  /**
   * 얕은 선언을 먼저 붙여 부모가 자식보다 늘 먼저 존재하게 한다.
   *
   * 순서가 뒤집히면 `a.b`를 붙일 때 `a`가 아직 없어 최상위로 밀려나고,
   * 사용자가 배열 아래에 만든 필드가 목록 바닥에 따로 나타난다.
   */
  private sortByDepth(
    variables: readonly TemplateVariable[],
  ): readonly TemplateVariable[] {
    return [...variables].sort(
      (first, second) => first.name.split(".").length - second.name.split(".").length,
    );
  }

  /** 마지막 점 앞까지를 부모 경로로 본다. 점이 없으면 최상위다. */
  private parentPathOf(path: string): string | null {
    const separator = path.lastIndexOf(".");
    return separator === -1 ? null : path.slice(0, separator);
  }

  /** 선언 하나를 자식이 없는 항목으로 바꾼다. 중첩은 attach가 만든다. */
  private fromVariable(variable: TemplateVariable): PaletteEntry {
    return {
      path: variable.name,
      label: variable.label,
      type: variable.type,
      children: [],
      sensitive: variable.sensitive,
      arrayPath: null,
    };
  }

  /** 이미 있는 경로를 중복해서 붙이지 않도록 모두 모은다. */
  private collectPaths(entries: readonly PaletteEntry[]): readonly string[] {
    return entries.flatMap((entry) => [entry.path, ...this.collectPaths(entry.children)]);
  }
}
