import type { FieldSchema } from "@report-tool/core";

/** 검색 중에도 중첩 필드의 부모 문맥을 잃지 않는 스키마 부분집합을 만든다. */
export class FieldPaletteFilter {
  /** 라벨·전체 경로·타입 중 검색어와 맞는 필드와 부모 그룹만 반환한다. */
  filter(fields: FieldSchema, query: string): FieldSchema {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    if (normalizedQuery === "") return fields;
    return this.filterLevel(fields, normalizedQuery, "");
  }

  /** 화면에 실제로 추가할 수 있는 배열 그룹 이외의 필드 수를 계산한다. */
  countFields(fields: FieldSchema): number {
    return Object.values(fields).reduce((count, specification) => {
      const childCount = specification.children === undefined
        ? 0
        : this.countFields(specification.children);
      return count + childCount + (specification.type === "array" ? 0 : 1);
    }, 0);
  }

  /** 각 깊이에서 일치한 필드와 일치 자식을 가진 그룹을 재귀적으로 수집한다. */
  private filterLevel(fields: FieldSchema, query: string, parentPath: string): FieldSchema {
    const filtered: Record<string, FieldSchema[string]> = {};
    for (const [key, specification] of Object.entries(fields)) {
      const path = this.createPath(parentPath, key);
      if (this.matches(specification, path, query)) {
        filtered[key] = specification;
        continue;
      }
      const children = specification.children === undefined
        ? undefined
        : this.filterLevel(specification.children, query, path);
      if (!this.hasFields(children)) continue;
      filtered[key] = children === undefined ? specification : { ...specification, children };
    }
    return filtered;
  }

  /** 사용자가 기억하는 라벨·경로·타입 어느 표현으로도 필드를 찾게 한다. */
  private matches(specification: FieldSchema[string], path: string, query: string): boolean {
    return specification.label.toLocaleLowerCase("ko-KR").includes(query)
      || path.toLocaleLowerCase("ko-KR").includes(query)
      || specification.type.includes(query);
  }

  /** 자식 검색 결과가 부모 그룹을 보존할 만큼 하나라도 있는지 판별한다. */
  private hasFields(fields: FieldSchema | undefined): boolean {
    return fields !== undefined && Object.keys(fields).length > 0;
  }

  /** 중첩 키를 바인딩 가능한 전체 점 표기 경로로 결합한다. */
  private createPath(parentPath: string, key: string): string {
    if (parentPath === "" || key.includes(".")) return key;
    return `${parentPath}.${key}`;
  }
}
