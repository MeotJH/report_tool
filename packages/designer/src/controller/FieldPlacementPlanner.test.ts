import { Frame, PageSpec, Template, TextElement, TextStyle } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { FieldPlacementPlanner } from "./FieldPlacementPlanner.js";

describe("FieldPlacementPlanner", () => {
  it("빈 문서에서는 내용 영역의 왼쪽 위에 기본 크기로 배치한다", () => {
    const planner = new FieldPlacementPlanner();

    const frame = planner.next(createTemplate([]));

    expect(frame).toEqual(new Frame(12, 14, 55, 9));
  });

  it("기본 위치가 차 있으면 겹치지 않는 다음 칸을 고른다", () => {
    const planner = new FieldPlacementPlanner();
    const occupied = createText(new Frame(12, 14, 55, 9));

    const frame = planner.next(createTemplate([occupied]));

    expect(frame).toEqual(new Frame(71, 14, 55, 9));
  });

  it("문서 가장자리에 놓아도 기본 크기가 내용 영역을 벗어나지 않는다", () => {
    const planner = new FieldPlacementPlanner();

    const frame = planner.at(createTemplate([]), 205, 294);

    expect(frame).toEqual(new Frame(143, 274, 55, 9));
  });
});

/** 배치 규칙을 검증할 수 있도록 여백이 있는 A4 초안을 만든다. */
function createTemplate(elements: readonly TextElement[]): Template {
  return new Template({
    id: "template", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [14, 12, 14, 12]),
    fonts: ["Pretendard"], elements,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 이미 배치된 영역과 새 필드 후보의 충돌을 재현할 텍스트를 만든다. */
function createText(frame: Frame): TextElement {
  return new TextElement(
    "text", frame, 0, false,
    { kind: "literal", value: "텍스트" }, new TextStyle("Pretendard", 10),
  );
}
