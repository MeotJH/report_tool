import { describe, expect, it } from "vitest";
import {
  BindingResolver,
  Frame,
  StaticTableSource,
  TableColumn,
  TableElement,
  TableHeaderCells,
  TextLayout,
  TextStyle,
} from "@report-tool/core";
import type { PDFFont, PDFPage } from "pdf-lib";
import { PdfElementVisitor } from "./PdfElementVisitor";

/** 그려진 사각형의 채움 여부만 남겨 배경 규칙을 직접 확인한다. */
interface DrawnRectangle {
  readonly x: number;
  readonly y: number;
  readonly filled: boolean;
}

describe("PDF 표 머리글 칸", () => {
  it("머리글로 지정한 열은 모든 행에서 배경이 칠해지고 본문 칸은 칠하지 않는다", () => {
    const rectangles = renderTable(new TableHeaderCells([0]));

    const left = rectangles.filter((rectangle) => rectangle.x < 30);
    const right = rectangles.filter((rectangle) => rectangle.x >= 30);
    expect(left).toHaveLength(2);
    expect(left.every((rectangle) => rectangle.filled)).toBe(true);
    expect(right).toHaveLength(2);
    expect(right.some((rectangle) => rectangle.filled)).toBe(false);
  });

  it("머리글 지정이 없으면 어떤 칸도 칠하지 않는다", () => {
    const rectangles = renderTable(TableHeaderCells.none());

    expect(rectangles).toHaveLength(4);
    expect(rectangles.some((rectangle) => rectangle.filled)).toBe(false);
  });
});

/** 지정한 머리글 구성으로 2열 2행 표 하나를 그리고 사각형 명령만 수집한다. */
function renderTable(headerCells: TableHeaderCells): readonly DrawnRectangle[] {
  const rectangles: DrawnRectangle[] = [];
  const page = {
    drawRectangle: (options: { x: number; y: number; color?: unknown }) => {
      rectangles.push({ x: options.x, y: options.y, filled: options.color !== undefined });
    },
    drawText: () => undefined,
  } as unknown as PDFPage;
  const style = new TextStyle("Pretendard", 9);
  const font = {
    widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5,
  } as unknown as PDFFont;

  const visitor = new PdfElementVisitor(
    page, 297, new Map([["Pretendard:400", font]]), {},
    new BindingResolver(), new TextLayout(), new Map(),
  );
  visitor.visitTable(createTable(headerCells));
  return rectangles;
}

/** 머리글 지정 외의 조건이 결과에 끼어들지 않는 최소 표를 만든다. */
function createTable(headerCells: TableHeaderCells): TableElement {
  return new TableElement(
    "t1", new Frame(0, 0, 100, 40), 0, false,
    new StaticTableSource([
      { label: "기간", value: "7월" },
      { label: "합계", value: "23" },
    ]),
    [
      new TableColumn("label", "구분", "{{row.label}}", 30, "center", null),
      new TableColumn("value", "값", "{{row.value}}", 70, "left", null),
    ],
    8, new TextStyle("Pretendard", 9), new TextStyle("Pretendard", 9),
    false, "clip", false, headerCells,
  );
}
