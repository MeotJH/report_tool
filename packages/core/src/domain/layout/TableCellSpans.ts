import type { TableColumn } from "../element/TableColumn.js";
import type { TableElement } from "../element/TableElement.js";

/**
 * 표 한 줄에서 각 칸이 몇 열을 덮는지 한 곳에서 정한다.
 *
 * 원본 리포트의 `처리시간(시간/%)`은 이름이 하나인데 값은 `5.5`와 `25.1%` 두
 * 칸으로 나뉜다. 병합이 없으면 두 값을 한 칸에 `5.5 / 25.1%`로 합쳐 넣는
 * 우회밖에 없고, 그러면 값 사이의 세로선이 사라져 두 숫자가 한 값으로 읽힌다.
 *
 * 병합은 **이름의 문제이지 값의 문제가 아니다.** 그래서 열 이름 줄에만 적용하고
 * 본문 행은 손대지 않는다. 본문까지 병합하면 어떤 행은 여섯 칸, 어떤 행은 여덟
 * 칸이 되어 "몇 번째 칸이 무엇인가"가 행마다 달라진다.
 *
 * 이 판단이 캔버스와 PDF에 각각 있으면 반드시 갈라진다. 두 곳은 결과만 받아
 * 그린다 — `0`이면 앞 칸이 덮으므로 그리지 않고 자리만 넘긴다.
 */
export class TableCellSpans {
  /** 열 순서대로, 그 칸이 덮는 열 수다. `0`은 앞 칸이 덮는다는 뜻이다. */
  private constructor(private readonly counts: readonly number[]) {}

  /**
   * 이 줄의 병합 상태를 만든다. 본문 행은 모든 칸이 자기 열 하나씩이다.
   *
   * `bodyIndex`가 `null`인 줄만 열 이름 줄이다. 표가 쪽을 넘어도 그 줄은 쪽마다
   * 다시 그려지므로, 판단 근거는 쪽 안에서의 줄 번호가 아니라 이 값이어야 한다.
   */
  static forRow(element: TableElement, bodyIndex: number | null): TableCellSpans {
    if (bodyIndex !== null) {
      return new TableCellSpans(element.columns.map(() => 1));
    }
    return TableCellSpans.merged(element.columns);
  }

  /** 뒤 열을 덮은 만큼 그 열들을 `0`으로 접어 열 수와 길이를 맞춘다. */
  private static merged(columns: readonly TableColumn[]): TableCellSpans {
    const counts: number[] = [];
    let index = 0;
    while (index < columns.length) {
      const span = Math.min(columns[index]?.headerSpan ?? 1, columns.length - index);
      counts.push(span);
      for (let covered = 1; covered < span; covered += 1) counts.push(0);
      index += span;
    }
    return new TableCellSpans(counts);
  }

  /** 이 칸이 덮는 열 수다. `0`이면 앞 칸이 덮으므로 그리지 않는다. */
  countAt(columnIndex: number): number {
    return this.counts[columnIndex] ?? 1;
  }

  /** 병합까지 반영한 이 칸의 실제 mm 너비다. */
  widthMm(columns: readonly TableColumn[], columnIndex: number): number {
    const span = this.countAt(columnIndex);
    return columns
      .slice(columnIndex, columnIndex + span)
      .reduce((total, column) => total + column.width, 0);
  }

  /** 렌더러가 그대로 들고 다닐 수 있도록 배열로 낸다. */
  toArray(): readonly number[] {
    return [...this.counts];
  }
}
