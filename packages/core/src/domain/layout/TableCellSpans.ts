import type { TableColumn } from "../element/TableColumn.js";
import type { TableElement } from "../element/TableElement.js";

/**
 * 표 한 줄에서 각 칸이 몇 열을 덮는지 한 곳에서 정한다.
 *
 * 원본 리포트의 `처리시간(시간/%)`은 이름이 하나인데 값은 `5.5`와 `25.1%` 두
 * 칸으로 나뉜다. 병합이 없으면 두 값을 한 칸에 `5.5 / 25.1%`로 합쳐 넣는
 * 우회밖에 없고, 그러면 값 사이의 세로선이 사라져 두 숫자가 한 값으로 읽힌다.
 *
 * 본문에도 병합이 있다. `합계` 행은 `상위업무명`과 `하위업무명` 두 칸에 걸친다.
 * 다만 근거가 다르다 — 열 이름 줄의 병합은 **열**이 정하고(`headerSpan`), 본문의
 * 병합은 **그 행의 값**이 정한다(`mergesWhenEmpty`인 열의 칸이 비었을 때).
 *
 * 본문 병합을 행 번호로 지정하지 않는 이유는, 데이터가 한 줄만 늘어도 엉뚱한
 * 줄이 병합되기 때문이다.
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
  static forRow(
    element: TableElement,
    bodyIndex: number | null,
    cells: readonly string[] = [],
  ): TableCellSpans {
    const spanAt = bodyIndex === null
      ? (index: number) => element.columns[index]?.headerSpan ?? 1
      : (index: number) => TableCellSpans.bodySpanAt(element.columns, cells, index);
    return TableCellSpans.folded(element.columns.length, spanAt);
  }

  /**
   * 본문 한 칸이 뒤로 몇 칸까지 덮는지 그 행의 값으로 정한다.
   *
   * 덮는 조건은 **뒤 칸이 비어 있는 것**이다. 비어 있지 않은 값을 덮으면 그
   * 값이 사라진다.
   */
  private static bodySpanAt(
    columns: readonly TableColumn[],
    cells: readonly string[],
    index: number,
  ): number {
    let span = 1;
    while (index + span < columns.length
      && columns[index + span]?.mergesWhenEmpty === true
      && (cells[index + span] ?? "").trim() === "") {
      span += 1;
    }
    return span;
  }

  /** 뒤 열을 덮은 만큼 그 열들을 `0`으로 접어 열 수와 길이를 맞춘다. */
  private static folded(
    columnCount: number,
    spanAt: (index: number) => number,
  ): TableCellSpans {
    const counts: number[] = [];
    let index = 0;
    while (index < columnCount) {
      const span = Math.min(spanAt(index), columnCount - index);
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
