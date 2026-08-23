import {
  Frame,
  PageSpec,
  Template,
  TemplateVariable,
  TextElement,
  TextStyle,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { EditorActions } from "./EditorActions.js";
import { EditorController } from "./EditorController.js";

/** 변수 편집 검증에 쓸 편집 세션을 만든다. */
function createEditor() {
  const template = new Template({
    id: "contract", name: "계약서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"],
    elements: [new TextElement(
      "t", new Frame(10, 10, 50, 8), 0, false,
      { kind: "literal", value: "계약서" }, new TextStyle("Pretendard", 10),
    )],
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  });
  const controller = new EditorController(template);
  return { controller, actions: new EditorActions(controller) };
}

describe("변수 편집 행동", () => {
  it("새 변수를 목록에 추가한다", () => {
    const { controller, actions } = createEditor();

    actions.addVariable(new TemplateVariable("pay.bonus", "상여금", "currency", true));

    expect(controller.getTemplate().toJSON().variables).toEqual([
      { name: "pay.bonus", label: "상여금", type: "currency", required: true, children: [] },
    ]);
  });

  it("변수 추가를 실행 취소로 되돌린다", () => {
    const { controller, actions } = createEditor();

    actions.addVariable(new TemplateVariable("pay.bonus", "상여금", "currency"));
    controller.undo();

    expect(controller.getTemplate().variables).toEqual([]);
  });

  it("이름이 겹치면 추가하지 않고 알린다", () => {
    const { controller, actions } = createEditor();
    actions.addVariable(new TemplateVariable("pay.bonus", "상여금", "currency"));

    actions.addVariable(new TemplateVariable("pay.bonus", "성과급", "currency"));

    expect(controller.getTemplate().variables).toHaveLength(1);
    expect(controller.getNotice()).toContain("pay.bonus");
  });

  it("변수 하나만 교체하고 나머지 순서를 유지한다", () => {
    const { controller, actions } = createEditor();
    actions.addVariable(new TemplateVariable("pay.bonus", "구이름", "currency"));
    actions.addVariable(new TemplateVariable("pay.net", "실지급액", "currency"));

    actions.updateVariable(
      "pay.bonus", new TemplateVariable("pay.bonus", "새이름", "currency"),
    );

    const variables = controller.getTemplate().variables;
    expect(variables[0]?.label).toBe("새이름");
    expect(variables[1]?.name).toBe("pay.net");
  });

  it("변수를 지워도 그것을 참조하던 요소는 남는다", () => {
    const { controller, actions } = createEditor();
    actions.addVariable(new TemplateVariable("pay.bonus", "상여금", "currency"));

    actions.removeVariable("pay.bonus");

    expect(controller.getTemplate().variables).toEqual([]);
    expect(controller.getTemplate().getElements()).toHaveLength(1);
  });

  it("배열 변수를 자식 구성까지 저장한다", () => {
    const { controller, actions } = createEditor();

    actions.addVariable(new TemplateVariable("deductionItems", "공제 항목", "array", false, [
      new TemplateVariable("item", "항목", "string"),
      new TemplateVariable("amount", "금액", "currency"),
    ]));

    const variable = controller.getTemplate().variables[0] as DataVariable;
    expect(variable.children.map((child) => child.label)).toEqual(["항목", "금액"]);
  });
});
