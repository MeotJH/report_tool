import { describe, expect, it } from "vitest";
import type { Element } from "../element/Element.js";
import { TableElement } from "../element/TableElement.js";
import { TableColumn } from "../element/TableColumn.js";
import { BoundTableSource } from "../element/TableSource.js";
import { TextElement } from "../element/TextElement.js";
import { Template } from "../template/Template.js";
import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { PageSpec } from "../value/PageSpec.js";
import { TextStyle } from "../value/TextStyle.js";
import { DocumentLayout } from "./DocumentLayout.js";

/** 서비스 리포트의 처리내역처럼 행이 많은 표를 만든다. */
function ticketTable(frameHeightMm: number, rowHeightMm = 10): TableElement {
  const style = new TextStyle("Pretendard", 9);
  return new TableElement(
    "tickets", new Frame(20, 60, 170, frameHeightMm), 2, false,
    new BoundTableSource(new Binding("tickets")),
    [
      new TableColumn("no", "NO", "{{row.no}}", 30, "center", null),
      new TableColumn("body", "요청내용", "{{row.body}}", 140, "left", null),
    ],
    rowHeightMm, style, style, true, "clip",
  );
}

/** 제목처럼 첫 쪽에만 있는 요소를 만든다. */
function title(): TextElement {
  return new TextElement(
    "title", new Frame(20, 20, 170, 12), 1, false,
    { kind: "literal", value: "Customer Report" },
    new TextStyle("Pretendard", 18, { weight: 700 }),
  );
}

/** 표만 있는 문서를 만든다. */
function template(...elements: readonly Element[]): Template {
  return new Template({
    id: "report", name: "리포트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [20, 20, 20, 20]),
    fonts: ["Pretendard"], elements,
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  });
}

/** 처리 건수를 원하는 만큼 만든다. */
function tickets(count: number): unknown {
  return {
    tickets: Array.from({ length: count }, (_value, index) => ({
      no: String(index + 1),
      body: `${index + 1}번 요청`,
    })),
  };
}

describe("DocumentLayout", () => {
  const layout = new DocumentLayout();

  it("표가 자리에 다 들어가면 한 쪽으로 끝난다", () => {
    const pages = layout.compute(template(title(), ticketTable(50)), tickets(3));

    expect(pages).toHaveLength(1);
    expect(pages[0]?.placements).toHaveLength(2);
  });

  it("행이 많으면 다음 쪽으로 이어진다", () => {
    // 50mm 자리에 머리글 포함 다섯 줄만 들어간다.
    const pages = layout.compute(template(ticketTable(50)), tickets(12));

    expect(pages.length).toBeGreaterThan(1);
  });

  it("모든 행이 어느 쪽엔가 정확히 한 번씩 그려진다", () => {
    const pages = layout.compute(template(ticketTable(50)), tickets(12));

    const drawn = pages.flatMap((page) => page.placements.flatMap(
      (placement) => (placement.table?.rows ?? [])
        .filter((row) => row.bodyIndex !== null)
        .map((row) => row.bodyIndex),
    ));

    expect(drawn).toEqual([...Array(12).keys()]);
  });

  it("이어지는 쪽마다 열 이름 줄을 다시 그린다", () => {
    const pages = layout.compute(template(ticketTable(50)), tickets(12));

    for (const page of pages) {
      const table = page.placements[page.placements.length - 1]?.table;
      expect(table?.rows[0]?.bodyIndex).toBeNull();
      expect(table?.rows[0]?.cells).toEqual(["NO", "요청내용"]);
    }
  });

  it("이어지는 표는 본문 영역 맨 위에 놓이고 가로 자리는 그대로다", () => {
    const pages = layout.compute(template(ticketTable(50)), tickets(12));
    const continued = pages[1]?.placements[0]?.element;

    expect(continued?.frame.y).toBe(20);
    expect(continued?.frame.x).toBe(20);
    expect(continued?.frame.width).toBe(170);
  });

  it("이어지는 쪽에는 첫 쪽 요소를 다시 그리지 않는다", () => {
    const pages = layout.compute(template(title(), ticketTable(50)), tickets(12));

    expect(pages[1]?.placements.map((placement) => placement.element.id))
      .toEqual(["tickets"]);
  });

  it("쪽 번호는 0부터 차례로 매겨진다", () => {
    const pages = layout.compute(template(ticketTable(50)), tickets(30));

    expect(pages.map((page) => page.index)).toEqual([...Array(pages.length).keys()]);
  });

  it("한 쪽에도 들어가지 않는 행이 있어도 쪽이 무한히 늘어나지 않는다", () => {
    // 행 높이가 본문 영역보다 크다. 진행을 보장하지 않으면 영원히 끝나지 않는다.
    const pages = layout.compute(template(ticketTable(50, 300)), tickets(3));

    expect(pages.length).toBeLessThanOrEqual(4);
  });

  it("사용자가 만든 두 번째 쪽이 뒤에 따라온다", () => {
    const cover = title();
    const body = ticketTable(50).withPageIndex(1);

    const pages = layout.compute(template(cover, body), tickets(3));

    expect(pages).toHaveLength(2);
    expect(pages[0]?.placements.map((placement) => placement.element.id)).toEqual(["title"]);
    expect(pages[1]?.placements.map((placement) => placement.element.id)).toEqual(["tickets"]);
  });

  it("표가 이어지는 쪽이 다음 저작 쪽보다 먼저 나온다", () => {
    // 표지(0쪽) → 처리내역(1쪽) → 이어지는 쪽 → 맺음말(2쪽) 순서여야 읽을 수 있다.
    const cover = title();
    const body = ticketTable(50).withPageIndex(1);
    const closing = new TextElement(
      "closing", new Frame(20, 20, 170, 12), 1, false,
      { kind: "literal", value: "기타사항" },
      new TextStyle("Pretendard", 12), false, 2,
    );

    const pages = layout.compute(template(cover, body, closing), tickets(12));

    const ids = pages.map((page) => page.placements.map((placement) => placement.element.id));
    expect(ids[0]).toEqual(["title"]);
    expect(ids[1]).toEqual(["tickets"]);
    expect(ids[ids.length - 1]).toEqual(["closing"]);
    expect(ids.slice(2, -1).every((page) => page[0] === "tickets")).toBe(true);
  });

  it("데이터가 없으면 한 쪽으로 끝난다", () => {
    const pages = layout.compute(template(ticketTable(50)), {});

    expect(pages).toHaveLength(1);
  });
});
