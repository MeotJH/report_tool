/** 편집 도구와 화면이 같은 선택 집합을 공유하도록 요소 ID를 관리한다. */
export class SelectionModel {
  private selectedIds = new Set<string>();

  /** 단일 선택과 보조키 기반 추가 선택을 같은 진입점으로 처리한다. */
  select(id: string, additive = false): void {
    if (!additive) this.selectedIds.clear();
    this.selectedIds.add(id);
  }

  /** 영역 선택과 붙여넣기가 선택 집합 전체를 한 번에 교체하게 한다. */
  selectAll(ids: readonly string[]): void {
    this.selectedIds = new Set(ids);
  }

  /** Shift 클릭이 이미 선택된 요소를 선택 집합에서 빼낼 수 있게 한다. */
  toggle(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  /** 삭제된 요소가 선택 집합에 유령으로 남지 않게 한다. */
  retainOnly(existingIds: readonly string[]): void {
    const existing = new Set(existingIds);
    for (const id of [...this.selectedIds]) {
      if (!existing.has(id)) this.selectedIds.delete(id);
    }
  }

  /** 빈 캔버스를 클릭하거나 삭제한 뒤 남은 선택을 모두 해제한다. */
  clear(): void {
    this.selectedIds.clear();
  }

  /** 화면 노드가 선택 강조 대상인지 ID만으로 판단하게 한다. */
  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  /** 툴바와 Inspector가 다중 선택 여부를 같은 기준으로 판단하게 한다. */
  count(): number {
    return this.selectedIds.size;
  }

  /** 내부 Set을 노출하지 않고 현재 선택 순서를 보존한 복사본을 제공한다. */
  getSelectedIds(): readonly string[] {
    return [...this.selectedIds];
  }
}
