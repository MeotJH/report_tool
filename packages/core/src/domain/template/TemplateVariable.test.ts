import { describe, expect, it } from "vitest";
import { Frame } from "../value/Frame";
import { PageSpec } from "../value/PageSpec";
import { TextStyle } from "../value/TextStyle";
import { TextElement } from "../element/TextElement";
import { Template } from "./Template";
import { TemplateFactory } from "./TemplateFactory";
import { TemplateValidator } from "./TemplateValidator";
import { TemplateVariable } from "./TemplateVariable";

/** 변수 검증에 쓸 초안 템플릿을 만든다. */
function createTemplate(
  variables: readonly TemplateVariable[] = [],
  elements: readonly TextElement[] = [],
): Template {
  return new Template({
    id: "contract", name: "계약서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements, variables,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  });
}

describe("TemplateVariable", () => {
  it("이름이 그대로 데이터 조회 경로가 된다", () => {
    expect(new TemplateVariable("pay.bonus", "상여금", "currency").name).toBe("pay.bonus");
  });

  it("경로 조회를 깨뜨리는 이름을 거부한다", () => {
    expect(() => new TemplateVariable("", "빈 이름", "string"))
      .toThrow("변수 이름은 비어 있을 수 없다");
    expect(() => new TemplateVariable("{{x}}", "중괄호", "string"))
      .toThrow("변수 이름에 중괄호를 쓸 수 없다");
  });

  it("중첩은 점 경로로 표현하고 부모·자손 관계를 스스로 판단한다", () => {
    const child = new TemplateVariable("payItems.amount", "금액", "currency");

    expect(child.isChildOf("payItems")).toBe(true);
    expect(child.isChildOf("pay")).toBe(false);
    expect(child.isSelfOrDescendantOf("payItems.amount")).toBe(true);
    expect(child.isSelfOrDescendantOf("payItems")).toBe(true);
  });

  it("공백과 빈 구간이 섞인 이름을 거부한다", () => {
    expect(() => new TemplateVariable("employee. phone", "전화", "string"))
      .toThrow("변수 이름에 공백을 쓸 수 없다");
    expect(() => new TemplateVariable("employee..phone", "전화", "string"))
      .toThrow("변수 이름의 각 구간은 비어 있을 수 없다");
  });

  it("표현 설정만 교체하고 이름을 유지한다", () => {
    const variable = new TemplateVariable("payItems", "지급 항목", "array");

    const changed = variable.withDefinition({ label: "지급 내역", required: true });

    expect(changed.name).toBe("payItems");
    expect(changed.label).toBe("지급 내역");
    expect(changed.required).toBe(true);
  });
});

describe("변수 JSON 왕복", () => {
  it("상수와 배열 선언을 모두 복원한다", () => {
    const template = createTemplate([
      new TemplateVariable("pay.bonus", "상여금", "currency", true),
      new TemplateVariable("payItems", "지급 항목", "array", true),
      new TemplateVariable("payItems.item", "항목", "string"),
      new TemplateVariable("payItems.amount", "금액", "currency", true),
    ]);

    const restored = TemplateFactory.fromJSON(
      JSON.parse(JSON.stringify(template.toJSON())) as Record<string, unknown>,
    );

    expect(restored.toJSON()).toEqual(template.toJSON());
    expect(restored.variables).toHaveLength(4);
    expect(restored.variables[3]?.name).toBe("payItems.amount");
    expect(restored.variables[3]?.required).toBe(true);
  });

  it("변수 필드가 없는 기존 저장 데이터는 빈 목록으로 복원한다", () => {
    const json = createTemplate().toJSON();
    delete json.variables;

    expect(TemplateFactory.fromJSON(json).variables).toEqual([]);
  });

  it("변수를 교체해도 나머지 템플릿 상태는 유지된다", () => {
    const template = createTemplate([new TemplateVariable("pay.bonus", "구이름", "currency")]);

    const changed = template.withVariables([
      new TemplateVariable("pay.bonus", "새이름", "currency"),
    ]);

    expect(changed.variables[0]?.label).toBe("새이름");
    expect(changed.name).toBe("계약서");
    expect(changed.version).toBe(1);
  });
});

describe("변수 검증", () => {
  const validator = new TemplateValidator();
  const style = new TextStyle("Pretendard", 10);

  it("같은 이름의 변수가 둘이면 오류로 알린다", () => {
    const template = createTemplate([
      new TemplateVariable("pay.bonus", "상여금", "currency"),
      new TemplateVariable("pay.bonus", "성과급", "currency"),
    ], [new TextElement("t", new Frame(0, 0, 10, 10), 0, false,
      { kind: "literal", value: "x" }, style)]);

    expect(validator.validate(template).map((error) => error.message))
      .toContain("변수 이름 pay.bonus이(가) 중복되었다");
  });

  it("이름이 겹치지 않으면 오류가 없다", () => {
    const template = createTemplate([
      new TemplateVariable("pay.bonus", "상여금", "currency"),
    ], [new TextElement("t", new Frame(0, 0, 10, 10), 0, false,
      { kind: "literal", value: "x" }, style)]);

    expect(validator.validate(template)).toEqual([]);
  });
});

describe("TemplateVariable 미리보기 값", () => {
  it("선언에 예시값을 붙여 둔다", () => {
    const variable = new TemplateVariable("pay.bonus", "상여금", "currency", false, {
      sample: "1500000",
    });

    expect(variable.sample).toBe("1500000");
  });

  it("예시값이 없으면 없다고 말한다. 빈 문자열과 구분해야 한다", () => {
    // 빈 문자열은 "예시가 비어 있다"는 뜻이고, 없음은 "정하지 않았다"는 뜻이다.
    // 둘을 섞으면 채울 자리와 비워 둘 자리를 구분할 수 없다.
    expect(new TemplateVariable("pay.bonus", "상여금", "currency").sample).toBeNull();
  });

  it("예시값은 저장했다 되살려도 남는다", () => {
    const variable = new TemplateVariable("pay.bonus", "상여금", "currency", false, {
      sample: "1500000",
    });

    expect(variable.toJSON()["sample"]).toBe("1500000");
  });

  it("정하지 않은 예시는 저장본에 적지 않는다", () => {
    // 적어 두면 예시 기능이 생기기 전에 저장된 문서가 열었다 닫기만 해도
    // 달라진다. 변경 이력에서 실제 편집과 형식 변화를 구분할 수 없게 된다.
    expect("sample" in new TemplateVariable("pay.bonus", "상여금", "currency").toJSON())
      .toBe(false);
  });

  it("이름을 바꿔도 예시값은 따라간다", () => {
    const variable = new TemplateVariable("pay.bonus", "상여금", "currency", false, {
      sample: "1500000",
    });

    expect(variable.withName("pay.incentive").sample).toBe("1500000");
  });

  it("예시값만 바꾼 선언을 만든다", () => {
    const variable = new TemplateVariable("pay.bonus", "상여금", "currency");

    expect(variable.withDefinition({ sample: "2000000" }).sample).toBe("2000000");
    expect(variable.withDefinition({ sample: "2000000" }).label).toBe("상여금");
  });
});
