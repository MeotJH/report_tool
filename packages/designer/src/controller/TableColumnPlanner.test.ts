import type { FieldSchema } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { PaletteEntryBuilder, type PaletteEntry } from "./PaletteEntry.js";
import { TableColumnPlanner } from "./TableColumnPlanner.js";

/** 스키마를 팔레트 항목으로 바꿔 배열 자식 목록만 꺼낸다. */
function childrenOf(schema: FieldSchema): readonly PaletteEntry[] {
  const entries = new PaletteEntryBuilder().build({
    rows: { label: "행", type: "array", children: schema },
  }, []);
  return entries[0]!.children;
}

const children = childrenOf({
  item: { label: "항목", type: "string" },
  amount: { label: "금액", type: "currency" },
  count: { label: "수량", type: "number" },
  paidAt: { label: "지급일", type: "date" },
});

describe("TableColumnPlanner", () => {
  const planner = new TableColumnPlanner();

  it("자식 필드마다 열을 만들고 너비를 균등하게 나눈다", () => {
    const columns = planner.fromArrayChildren(children, 160);

    expect(columns).toHaveLength(4);
    expect(columns.map((column) => column.width)).toEqual([40, 40, 40, 40]);
  });

  it("스키마 label을 헤더로, key를 행 표현식으로 쓴다", () => {
    const columns = planner.fromArrayChildren(children, 100);

    expect(columns[0]?.header).toBe("항목");
    expect(columns[0]?.key).toBe("item");
    expect(columns[0]?.cellTemplate).toBe("{{row.item}}");
  });

  it("숫자와 금액은 오른쪽, 문자와 날짜는 왼쪽에 붙인다", () => {
    const columns = planner.fromArrayChildren(children, 100);

    expect(columns.map((column) => column.align))
      .toEqual(["left", "right", "right", "left"]);
  });

  it("타입에 맞는 포맷을 기본으로 제안한다", () => {
    const columns = planner.fromArrayChildren(children, 100);

    expect(columns[0]?.formatSpec).toBeNull();
    expect(columns[1]?.formatSpec).toEqual({ kind: "currency", currency: "KRW" });
    expect(columns[2]?.formatSpec).toEqual({ kind: "number", thousands: true });
    expect(columns[3]?.formatSpec).toEqual({ kind: "date", pattern: "YYYY-MM-DD" });
  });

  it("표 안의 표는 만들지 않으므로 중첩 배열은 열에서 제외한다", () => {
    const nested = childrenOf({
      item: { label: "항목", type: "string" },
      details: { label: "내역", type: "array", children: { note: { label: "비고", type: "string" } } },
    });

    const columns = planner.fromArrayChildren(nested, 100);

    expect(columns.map((column) => column.key)).toEqual(["item"]);
    expect(columns[0]?.width).toBe(100);
  });

  it("열이 될 자식이 없으면 표를 만들지 않는다", () => {
    const onlyArrays = childrenOf({
      details: { label: "내역", type: "array", children: { note: { label: "비고", type: "string" } } },
    }).filter((child) => child.type === "array");

    expect(() => planner.fromArrayChildren(onlyArrays, 100))
      .toThrow("표로 만들 수 있는 자식 필드가 없다");
  });

  it("기존 너비 합계를 유지한 채 열만 교체한다", () => {
    const columns = planner.fromArrayChildrenKeepingWidth(children, [60, 40]);

    expect(columns.reduce((sum, column) => sum + column.width, 0)).toBe(100);
  });
});
