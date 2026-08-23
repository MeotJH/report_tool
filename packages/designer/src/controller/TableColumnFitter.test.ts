import { TableColumn } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { TableColumnFitter } from "./TableColumnFitter.js";

/** 너비만 다른 열을 짧게 만든다. */
function column(key: string, width: number): TableColumn {
  return new TableColumn(key, key, `{{row.${key}}}`, width, "left", null);
}

/** 열 너비의 합을 구한다. */
function sumOf(columns: readonly TableColumn[]): number {
  return Math.round(columns.reduce((sum, item) => sum + item.width, 0) * 100) / 100;
}

describe("TableColumnFitter", () => {
  const fitter = new TableColumnFitter();

  it("합이 이미 맞으면 그대로 둔다", () => {
    const columns = [column("a", 110), column("b", 60)];

    expect(fitter.fitToWidth(columns, 170)).toBe(columns);
  });

  it("열이 늘어 합이 넘치면 프레임 너비로 되돌린다", () => {
    const fitted = fitter.fitToWidth(
      [column("a", 110), column("b", 60), column("c", 20)], 170,
    );

    expect(sumOf(fitted)).toBe(170);
  });

  it("줄이거나 늘려도 기존 너비 비율을 유지한다", () => {
    const fitted = fitter.fitToWidth([column("a", 100), column("b", 50)], 75);

    expect(fitted[0]!.width / fitted[1]!.width).toBeCloseTo(2, 5);
  });

  it("열이 빠져 합이 모자라면 남은 열이 나눠 갖는다", () => {
    const fitted = fitter.fitToWidth([column("a", 110), column("b", 60)], 190);

    expect(sumOf(fitted)).toBe(190);
  });

  it("반올림 차이를 흡수해 합이 정확히 목표와 같게 한다", () => {
    const fitted = fitter.fitToWidth(
      [column("a", 33), column("b", 33), column("c", 33)], 100,
    );

    expect(sumOf(fitted)).toBe(100);
  });

  it("열 수가 많아도 읽을 수 없는 폭까지 줄이지는 않는다", () => {
    const columns = Array.from({ length: 10 }, (_value, index) => column(`c${index}`, 10));

    const fitted = fitter.fitToWidth(columns, 20);

    expect(fitted.every((item) => item.width >= 4)).toBe(true);
  });

  it("열이 없으면 아무것도 하지 않는다", () => {
    expect(fitter.fitToWidth([], 170)).toEqual([]);
  });

  it("너비와 정렬 외의 열 설정은 보존한다", () => {
    const original = new TableColumn(
      "amount", "금액", "{{row.amount}}", 60, "right", { kind: "currency", currency: "KRW" },
    );

    const [fitted] = fitter.fitToWidth([original, column("b", 40)], 50);

    expect(fitted?.key).toBe("amount");
    expect(fitted?.header).toBe("금액");
    expect(fitted?.cellTemplate).toBe("{{row.amount}}");
    expect(fitted?.align).toBe("right");
    expect(fitted?.formatSpec).toEqual({ kind: "currency", currency: "KRW" });
  });
});
