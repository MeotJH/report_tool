import { TableColumn } from "@report-tool/core";

/**
 * 열 너비의 합을 표 프레임 너비와 항상 같게 유지한다.
 *
 * 합이 프레임을 넘으면 넘친 열은 표 밖에 그려진다. 그리고 편집기는 요소를
 * 프레임으로 찾으므로 그 열 위에는 데이터를 놓을 수도, 클릭할 수도 없다.
 * "보이는데 만질 수 없는 열"이 생기지 않도록 열 구조가 바뀔 때마다 맞춘다.
 */
export class TableColumnFitter {
  /** 너비를 나눠 가져도 글자가 들어갈 최소 폭이다. */
  private static readonly MINIMUM_WIDTH_MM = 4;

  /**
   * 기존 비율을 유지한 채 열 너비 합을 지정한 너비에 맞춘다.
   *
   * 비율을 유지하는 이유는 사용자가 정한 "항목 열이 금액 열보다 넓다"는 의도가
   * 열 하나를 더했다고 사라지면 안 되기 때문이다.
   */
  fitToWidth(
    columns: readonly TableColumn[],
    totalWidthMm: number,
  ): readonly TableColumn[] {
    if (columns.length === 0) return columns;
    const target = this.usableWidth(columns, totalWidthMm);
    const current = this.sumOf(columns);
    if (current === target) return columns;
    const scaled = this.scale(columns, target / current);
    return this.absorbRoundingError(scaled, target);
  }

  /**
   * 열 수만큼 폭을 고르게 나눈 한 열의 폭을 준다.
   *
   * 붙여넣기로 열을 새로 만들 때 쓴다. 그때는 유지할 비율이 없으므로 고르게 나누고,
   * 열마다 다른 폭은 사람이 뒤에 정한다. 짐작해서 넓혀 주면 사람이 정한 것과
   * 구별되지 않는다.
   */
  evenWidth(totalWidthMm: number, columnCount: number): number {
    if (columnCount <= 0) throw new Error("열이 없으면 폭을 나눌 수 없다");
    const usable = Math.max(totalWidthMm, columnCount * TableColumnFitter.MINIMUM_WIDTH_MM);
    return this.round(usable / columnCount);
  }

  /** 최소 폭조차 담을 수 없는 목표는 열 수에 맞춰 넓혀 음수 폭을 막는다. */
  private usableWidth(columns: readonly TableColumn[], totalWidthMm: number): number {
    const minimum = columns.length * TableColumnFitter.MINIMUM_WIDTH_MM;
    return Math.max(totalWidthMm, minimum);
  }

  /** 모든 열을 같은 비율로 줄이거나 늘린다. */
  private scale(
    columns: readonly TableColumn[],
    factor: number,
  ): readonly TableColumn[] {
    return columns.map((column) => column.withWidth(
      Math.max(TableColumnFitter.MINIMUM_WIDTH_MM, this.round(column.width * factor)),
    ));
  }

  /**
   * 반올림으로 남은 차이를 가장 넓은 열이 흡수하게 한다.
   *
   * 열마다 반올림하면 합이 목표와 0.1mm 단위로 어긋난다. 그대로 두면 열을 더할
   * 때마다 오차가 쌓여 결국 표가 다시 프레임을 벗어난다.
   */
  private absorbRoundingError(
    columns: readonly TableColumn[],
    target: number,
  ): readonly TableColumn[] {
    const difference = this.round(target - this.sumOf(columns));
    if (difference === 0) return columns;
    const widestIndex = this.widestIndexOf(columns);
    return columns.map((column, index) => (
      index === widestIndex
        ? column.withWidth(this.round(column.width + difference))
        : column
    ));
  }

  /** 차이를 흡수해도 다른 열보다 좁아지지 않을 열을 고른다. */
  private widestIndexOf(columns: readonly TableColumn[]): number {
    return columns.reduce(
      (widest, column, index) => (
        column.width > (columns[widest]?.width ?? 0) ? index : widest
      ),
      0,
    );
  }

  /** 현재 열 너비의 합을 구한다. */
  private sumOf(columns: readonly TableColumn[]): number {
    return this.round(columns.reduce((sum, column) => sum + column.width, 0));
  }

  /** mm 단위 저장값이 부동소수 오차를 남기지 않도록 소수 둘째 자리로 맞춘다. */
  private round(millimeters: number): number {
    return Math.round(millimeters * 100) / 100;
  }
}
