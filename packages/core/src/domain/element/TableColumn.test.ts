import { describe, expect, it } from "vitest";
import { TableColumn } from "./TableColumn.js";

/** 원본 리포트의 `처리시간(시간/%)`처럼 두 칸을 덮는 열을 만든다. */
function spanningColumn(): TableColumn {
  return new TableColumn(
    "hours", "처리시간(시간/%)", "{{row.hours}}", 14.99, "center", null,
    2, true, "left",
  );
}

describe("TableColumn.withAlign", () => {
  it("정렬만 바꾸고 머리글 병합을 풀지 않는다", () => {
    expect(spanningColumn().withAlign("left").headerSpan).toBe(2);
  });

  it("정렬만 바꾸고 빈 칸 흡수 설정을 풀지 않는다", () => {
    expect(spanningColumn().withAlign("left").mergesWhenEmpty).toBe(true);
  });

  it("일부러 다르게 둔 머리글 정렬은 그대로 지킨다", () => {
    expect(spanningColumn().withAlign("right").headerAlign).toBe("left");
  });

  it("머리글이 본문과 같은 정렬이었으면 함께 따라간다", () => {
    const column = new TableColumn("no", "NO", "{{row.no}}", 7.23, "center", null);
    expect(column.withAlign("left").headerAlign).toBe("left");
  });

  it("바꾸려던 정렬은 실제로 바뀐다", () => {
    expect(spanningColumn().withAlign("right").align).toBe("right");
  });

  it("키와 표현식은 건드리지 않는다", () => {
    const changed = spanningColumn().withAlign("left");
    expect(changed.key).toBe("hours");
    expect(changed.cellTemplate).toBe("{{row.hours}}");
  });
});

describe("TableColumn.withHeaderAlign", () => {
  it("머리글 정렬만 바꾸고 본문 정렬은 두지 않는다", () => {
    const column = new TableColumn("type", "처리구분별", "{{row.type}}", 69.99, "left", null);
    const changed = column.withHeaderAlign("center");
    expect(changed.headerAlign).toBe("center");
    expect(changed.align).toBe("left");
  });
});

describe("TableColumn.withFormatSpec", () => {
  it("표시 형식만 바꾸고 머리글 병합을 풀지 않는다", () => {
    const changed = spanningColumn().withFormatSpec({ kind: "number", suffix: "시간" });
    expect(changed.headerSpan).toBe(2);
    expect(changed.mergesWhenEmpty).toBe(true);
  });

  it("형식을 없앨 수 있다 — null이 \"그대로\"라는 뜻이다", () => {
    const withSpec = spanningColumn().withFormatSpec({ kind: "percent", decimals: 1 });
    expect(withSpec.withFormatSpec(null).formatSpec).toBeNull();
  });

  it("정렬을 바꿔도 표시 형식을 잃지 않는다", () => {
    const withSpec = spanningColumn().withFormatSpec({ kind: "number", suffix: "%" });
    expect(withSpec.withAlign("right").formatSpec).toEqual({ kind: "number", suffix: "%" });
  });
});
