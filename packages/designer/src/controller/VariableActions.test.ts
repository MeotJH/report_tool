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
      { name: "pay.bonus", label: "상여금", type: "currency", required: true },
    ]);
  });

  it("배열과 자식 선언을 한 번의 실행 취소로 되돌린다", () => {
    const { controller, actions } = createEditor();

    actions.addVariables([
      new TemplateVariable("deductionItems", "공제 항목", "array"),
      new TemplateVariable("deductionItems.item", "항목", "string"),
      new TemplateVariable("deductionItems.amount", "금액", "currency"),
    ]);
    expect(controller.getTemplate().variables).toHaveLength(3);

    controller.undo();

    expect(controller.getTemplate().variables).toEqual([]);
  });

  it("배열에 필드를 나중에 더할 수 있다", () => {
    const { controller, actions } = createEditor();
    actions.addVariable(new TemplateVariable("employee.phone", "전화번호", "string"));

    expect(controller.getTemplate().variables[0]?.name).toBe("employee.phone");
  });

  it("이미 있는 이름만 건너뛰고 나머지는 추가한다", () => {
    const { controller, actions } = createEditor();
    actions.addVariable(new TemplateVariable("rows", "행", "array"));

    actions.addVariables([
      new TemplateVariable("rows", "행", "array"),
      new TemplateVariable("rows.item", "항목", "string"),
    ]);

    expect(controller.getTemplate().variables.map((one) => one.name))
      .toEqual(["rows", "rows.item"]);
    expect(controller.getNotice()).toContain("rows");
  });

  it("배열을 지우면 그 자식 선언도 함께 사라진다", () => {
    const { controller, actions } = createEditor();
    actions.addVariables([
      new TemplateVariable("rows", "행", "array"),
      new TemplateVariable("rows.item", "항목", "string"),
      new TemplateVariable("other", "다른 값", "string"),
    ]);

    actions.removeVariable("rows");

    expect(controller.getTemplate().variables.map((one) => one.name)).toEqual(["other"]);
  });

  it("배열 이름을 바꾸면 자식 경로도 함께 옮긴다", () => {
    const { controller, actions } = createEditor();
    actions.addVariables([
      new TemplateVariable("rows", "행", "array"),
      new TemplateVariable("rows.item", "항목", "string"),
    ]);

    actions.updateVariable("rows", new TemplateVariable("deductions", "공제", "array"));

    expect(controller.getTemplate().variables.map((one) => one.name))
      .toEqual(["deductions", "deductions.item"]);
  });

  it("없는 선언을 지우려 하면 이유를 알린다", () => {
    const { controller, actions } = createEditor();

    actions.removeVariable("employee.name");

    expect(controller.getNotice()).toContain("지울 선언을 찾지 못했습니다");
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

});
