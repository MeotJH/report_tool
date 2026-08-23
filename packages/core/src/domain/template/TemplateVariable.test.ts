import { describe, expect, it } from "vitest";
import { Frame } from "../value/Frame";
import { PageSpec } from "../value/PageSpec";
import { TextStyle } from "../value/TextStyle";
import { Binding } from "../value/Binding";
import { FieldElement } from "../element/FieldElement";
import { TextElement } from "../element/TextElement";
import { TemplateExpression } from "../element/TemplateExpression";
import { BindingResolver } from "./BindingResolver";
import { Template } from "./Template";
import { TemplateFactory } from "./TemplateFactory";
import { TemplateValidator } from "./TemplateValidator";
import { ConstantVariable, DataVariable, type TemplateVariable } from "./TemplateVariable";

/** 변수 검증에 쓸 초안 템플릿을 만든다. */
function createTemplate(
  variables: readonly TemplateVariable[] = [],
  elements: readonly (FieldElement | TextElement)[] = [],
): Template {
  return new Template({
    id: "contract", name: "계약서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements, variables,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  });
}

describe("ConstantVariable", () => {
  it("예약 이름공간 아래의 참조 경로를 제공한다", () => {
    expect(new ConstantVariable("회사명", "아이에스유").path()).toBe("const.회사명");
  });

  it("이름이 그대로 사람이 읽는 이름이 된다", () => {
    expect(new ConstantVariable("회사명", "아이에스유").label).toBe("회사명");
  });

  it("값과 이름을 각각 불변으로 교체한다", () => {
    const constant = new ConstantVariable("회사명", "아이에스유");

    expect(constant.withValue("ISU").value).toBe("ISU");
    expect(constant.withName("상호").path()).toBe("const.상호");
    expect(constant.value).toBe("아이에스유");
  });

  it("경로 조회를 깨뜨리는 이름을 거부한다", () => {
    expect(() => new ConstantVariable("회사.명", "x"))
      .toThrow("상수 이름에는 글자·숫자·밑줄만 쓸 수 있다");
    expect(() => new ConstantVariable("회사 명", "x"))
      .toThrow("상수 이름에는 글자·숫자·밑줄만 쓸 수 있다");
    expect(() => new ConstantVariable("", "x"))
      .toThrow("변수 이름은 비어 있을 수 없다");
  });
});

describe("DataVariable", () => {
  it("선언한 이름이 그대로 데이터 조회 경로가 된다", () => {
    expect(new DataVariable("pay.bonus", "상여금", "currency").path()).toBe("pay.bonus");
  });

  it("배열 변수는 자식 선언을 가질 수 있다", () => {
    const variable = new DataVariable("payItems", "지급 항목", "array", false, [
      new DataVariable("item", "항목", "string"),
      new DataVariable("amount", "금액", "currency"),
    ]);

    expect(variable.children.map((child) => child.label)).toEqual(["항목", "금액"]);
  });

  it("배열이 아닌 변수에 자식을 넣지 못한다", () => {
    expect(() => new DataVariable("pay.bonus", "상여금", "currency", false, [
      new DataVariable("item", "항목", "string"),
    ])).toThrow("배열이 아닌 변수는 자식 변수를 가질 수 없다");
  });

  it("표현 설정만 교체하고 자식 구성을 유지한다", () => {
    const variable = new DataVariable("payItems", "지급 항목", "array", false, [
      new DataVariable("item", "항목", "string"),
    ]);

    const changed = variable.withDefinition({ label: "지급 내역", required: true });

    expect(changed.label).toBe("지급 내역");
    expect(changed.required).toBe(true);
    expect(changed.children).toHaveLength(1);
  });
});

describe("상수를 데이터로 합치기", () => {
  it("호스트 데이터 위에 예약 이름공간으로 얹는다", () => {
    const template = createTemplate([new ConstantVariable("회사명", "아이에스유")]);

    const resolved = template.resolveData({ employee: { name: "김지훈" } }) as Record<string, unknown>;

    expect(resolved.const).toEqual({ 회사명: "아이에스유" });
    expect(resolved.employee).toEqual({ name: "김지훈" });
  });

  it("상수가 없으면 호스트 데이터를 그대로 넘긴다", () => {
    const data = { employee: { name: "김지훈" } };

    expect(createTemplate().resolveData(data)).toBe(data);
  });

  it("데이터가 없어도 상수만으로 조회할 수 있다", () => {
    const template = createTemplate([new ConstantVariable("회사명", "아이에스유")]);

    const resolved = template.resolveData(undefined) as Record<string, unknown>;

    expect(resolved.const).toEqual({ 회사명: "아이에스유" });
  });

  it("선언 필드는 값을 만들지 않는다", () => {
    const template = createTemplate([new DataVariable("pay.bonus", "상여금", "currency")]);

    expect(template.resolveData({ a: 1 })).toEqual({ a: 1 });
  });

  it("한글 상수를 문구 치환에서 쓸 수 있다", () => {
    const template = createTemplate([new ConstantVariable("회사명", "아이에스유")]);

    const rendered = TemplateExpression.render(
      "{{const.회사명}} 귀중", template.resolveData({}),
    );

    expect(rendered).toBe("아이에스유 귀중");
  });

  it("한글 상수를 필드 바인딩에서 쓸 수 있다", () => {
    const template = createTemplate([new ConstantVariable("대표자", "홍길동")]);

    const value = new BindingResolver().resolve(
      new Binding("const.대표자"), template.resolveData({}),
    );

    expect(value).toBe("홍길동");
  });
});

describe("변수 JSON 왕복", () => {
  it("상수와 배열 선언을 모두 복원한다", () => {
    const template = createTemplate([
      new ConstantVariable("회사명", "아이에스유"),
      new DataVariable("payItems", "지급 항목", "array", true, [
        new DataVariable("item", "항목", "string"),
        new DataVariable("amount", "금액", "currency", true),
      ]),
    ]);

    const restored = TemplateFactory.fromJSON(
      JSON.parse(JSON.stringify(template.toJSON())) as Record<string, unknown>,
    );

    expect(restored.toJSON()).toEqual(template.toJSON());
    expect(restored.variables).toHaveLength(2);
    expect((restored.variables[1] as DataVariable).children[1]?.required).toBe(true);
  });

  it("변수 필드가 없는 기존 저장 데이터는 빈 목록으로 복원한다", () => {
    const json = createTemplate().toJSON();
    delete json.variables;

    expect(TemplateFactory.fromJSON(json).variables).toEqual([]);
  });

  it("변수를 교체해도 나머지 템플릿 상태는 유지된다", () => {
    const template = createTemplate([new ConstantVariable("회사명", "구값")]);

    const changed = template.withVariables([new ConstantVariable("회사명", "새값")]);

    expect((changed.variables[0] as ConstantVariable).value).toBe("새값");
    expect(changed.name).toBe("계약서");
    expect(changed.version).toBe(1);
  });
});

describe("변수 검증", () => {
  const validator = new TemplateValidator();
  const style = new TextStyle("Pretendard", 10);

  it("같은 이름의 변수가 둘이면 오류로 알린다", () => {
    const template = createTemplate([
      new ConstantVariable("회사명", "가"),
      new ConstantVariable("회사명", "나"),
    ], [new TextElement("t", new Frame(0, 0, 10, 10), 0, false,
      { kind: "literal", value: "x" }, style)]);

    expect(validator.validate(template).map((error) => error.message))
      .toContain("변수 이름 회사명이 중복되었다");
  });

  it("선언되지 않은 상수를 참조하는 필드를 찾아낸다", () => {
    const template = createTemplate([], [
      new FieldElement("f", new Frame(0, 0, 10, 10), 0, false,
        new Binding("const.회사명"), style),
    ]);

    const errors = validator.validate(template);

    expect(errors.map((error) => error.message))
      .toContain("선언되지 않은 상수 회사명을 참조한다");
    expect(errors[errors.length - 1]?.elementId).toBe("f");
  });

  it("선언되지 않은 상수를 참조하는 문구도 찾아낸다", () => {
    const template = createTemplate([], [
      new TextElement("t", new Frame(0, 0, 10, 10), 0, false,
        { kind: "template", value: "{{const.대표자}} 인" }, style),
    ]);

    expect(validator.validate(template).map((error) => error.message))
      .toContain("선언되지 않은 상수 대표자를 참조한다");
  });

  it("선언된 상수를 참조하면 오류가 없다", () => {
    const template = createTemplate([new ConstantVariable("회사명", "아이에스유")], [
      new FieldElement("f", new Frame(0, 0, 10, 10), 0, false,
        new Binding("const.회사명"), style),
    ]);

    expect(validator.validate(template)).toEqual([]);
  });

  it("고정 문구는 표현식 검사 대상이 아니다", () => {
    const template = createTemplate([], [
      new TextElement("t", new Frame(0, 0, 10, 10), 0, false,
        { kind: "literal", value: "{{const.회사명}}" }, style),
    ]);

    expect(validator.validate(template)).toEqual([]);
  });
});
