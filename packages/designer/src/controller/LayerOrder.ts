import type { Element } from "@report-tool/core";

/**
 * 요소의 쌓임 순서를 0부터 시작하는 촘촘한 정수로 다시 매긴다.
 *
 * z 값을 그때그때 더하거나 빼면 값이 벌어지거나 같아져서 "한 칸 앞으로"가
 * 아무 일도 하지 않는 상태가 생긴다. 순서를 배열 위치로 바꿔 계산한 뒤
 * 위치를 그대로 z로 쓰면 이런 상태가 만들어지지 않는다.
 */
export class LayerOrder {
  /** 선택 요소를 가장 위로 올린 새 z 배정을 계산한다. */
  toFront(elements: readonly Element[], selectedIds: readonly string[]): ReadonlyMap<string, number> {
    const { selected, others } = this.partition(elements, selectedIds);
    return this.assign([...others, ...selected]);
  }

  /** 선택 요소를 가장 아래로 내린 새 z 배정을 계산한다. */
  toBack(elements: readonly Element[], selectedIds: readonly string[]): ReadonlyMap<string, number> {
    const { selected, others } = this.partition(elements, selectedIds);
    return this.assign([...selected, ...others]);
  }

  /** 선택 요소를 한 칸씩 위로 올린 새 z 배정을 계산한다. */
  forward(elements: readonly Element[], selectedIds: readonly string[]): ReadonlyMap<string, number> {
    return this.assign(this.shift(this.sorted(elements), selectedIds, 1));
  }

  /** 선택 요소를 한 칸씩 아래로 내린 새 z 배정을 계산한다. */
  backward(elements: readonly Element[], selectedIds: readonly string[]): ReadonlyMap<string, number> {
    return this.assign(this.shift(this.sorted(elements), selectedIds, -1));
  }

  /** 인접한 비선택 요소와만 자리를 바꿔 선택 요소들의 상대 순서를 유지한다. */
  private shift(
    ordered: readonly Element[],
    selectedIds: readonly string[],
    direction: 1 | -1,
  ): readonly Element[] {
    const selected = new Set(selectedIds);
    const result = [...ordered];
    const indexes = direction === 1
      ? [...result.keys()].reverse()
      : [...result.keys()];
    for (const index of indexes) {
      const target = index + direction;
      if (!selected.has(result[index]!.id)) continue;
      if (target < 0 || target >= result.length) continue;
      if (selected.has(result[target]!.id)) continue;
      [result[index], result[target]] = [result[target]!, result[index]!];
    }
    return result;
  }

  /** 순서 계산이 항상 현재 화면과 같은 아래→위 순서에서 시작하게 한다. */
  private sorted(elements: readonly Element[]): readonly Element[] {
    return [...elements].sort((first, second) => first.z - second.z);
  }

  /** 선택 요소와 나머지를 각각 현재 순서를 유지한 두 묶음으로 나눈다. */
  private partition(
    elements: readonly Element[],
    selectedIds: readonly string[],
  ): Readonly<{ selected: readonly Element[]; others: readonly Element[] }> {
    const selected = new Set(selectedIds);
    const ordered = this.sorted(elements);
    return {
      selected: ordered.filter((element) => selected.has(element.id)),
      others: ordered.filter((element) => !selected.has(element.id)),
    };
  }

  /** 배열 위치를 그대로 z로 배정하고 실제로 바뀐 요소만 남긴다. */
  private assign(ordered: readonly Element[]): ReadonlyMap<string, number> {
    const changes = new Map<string, number>();
    ordered.forEach((element, index) => {
      if (element.z !== index) changes.set(element.id, index);
    });
    return changes;
  }
}
