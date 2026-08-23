import type { PaletteEntry } from "../controller/PaletteEntry.js";

/** 검색 중에도 중첩 필드의 부모 문맥을 잃지 않는 목록 부분집합을 만든다. */
export class FieldPaletteFilter {
  /** 라벨·전체 경로·타입 중 검색어와 맞는 항목과 부모 그룹만 반환한다. */
  filter(entries: readonly PaletteEntry[], query: string): readonly PaletteEntry[] {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    if (normalizedQuery === "") return entries;
    return this.filterLevel(entries, normalizedQuery);
  }

  /** 화면에서 실제로 놓을 수 있는 항목 수를 계산한다. */
  countFields(entries: readonly PaletteEntry[]): number {
    return entries.reduce((count, entry) => (
      count + this.countFields(entry.children) + 1
    ), 0);
  }

  /** 각 깊이에서 일치한 항목과 일치 자식을 가진 그룹을 재귀적으로 수집한다. */
  private filterLevel(
    entries: readonly PaletteEntry[],
    query: string,
  ): readonly PaletteEntry[] {
    const filtered: PaletteEntry[] = [];
    for (const entry of entries) {
      if (this.matches(entry, query)) {
        filtered.push(entry);
        continue;
      }
      const children = this.filterLevel(entry.children, query);
      if (children.length === 0) continue;
      filtered.push({ ...entry, children });
    }
    return filtered;
  }

  /** 사용자가 기억하는 라벨·경로·타입 어느 표현으로도 항목을 찾게 한다. */
  private matches(entry: PaletteEntry, query: string): boolean {
    return entry.label.toLocaleLowerCase("ko-KR").includes(query)
      || entry.path.toLocaleLowerCase("ko-KR").includes(query)
      || entry.type.includes(query);
  }
}
