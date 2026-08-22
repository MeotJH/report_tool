import {
  FieldElement,
  Frame,
  LineElement,
  PageSpec,
  TableElement,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { EditorController } from "../controller/EditorController.js";
import { FieldTool } from "./FieldTool.js";
import { SelectTool } from "./SelectTool.js";
import { ShapeTool } from "./ShapeTool.js";
import { TableTool } from "./TableTool.js";
import { TextTool } from "./TextTool.js";

describe("Editor tools", () => {
  it.each([
    [new TextTool(), TextElement],
    [new FieldTool("employee.name", null), FieldElement],
    [new ShapeTool("line"), LineElement],
    [new TableTool(), TableElement],
  ])("드래그가 %s 요소 추가 명령을 확정한다", (tool, elementType) => {
    const controller = new EditorController(createTemplate());
    controller.setTool(tool);

    controller.pointerDown(10, 20);
    controller.pointerMove(40, 35);
    controller.pointerUp(40, 35);

    expect(controller.getTemplate().getElements()[0]).toBeInstanceOf(elementType);
    expect(controller.getTemplate().getElements()[0]?.frame)
      .toEqual(new Frame(10, 20, 30, 15));
  });

  it("선택 도구가 최상단 요소를 선택하고 드래그 위치를 명령으로 확정한다", () => {
    const text = new TextElement(
      "text", new Frame(0, 0, 10, 10), 2, false,
      { kind: "literal", value: "텍스트" }, new TextStyle("Pretendard", 10),
    );
    const controller = new EditorController(createTemplate().addElement(text));
    controller.setTool(new SelectTool());

    controller.pointerDown(2, 2);
    controller.pointerMove(12, 12);
    controller.pointerUp(12, 12);

    expect(controller.getSelectionModel().isSelected("text")).toBe(true);
    expect(controller.getTemplate().getElements()[0]?.frame)
      .toEqual(new Frame(10, 10, 10, 10));
  });
});

/** 도구 통합 테스트가 사용할 빈 편집 템플릿을 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "template", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [0, 0, 0, 0]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}
