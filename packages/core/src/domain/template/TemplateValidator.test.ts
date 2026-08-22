import { describe, expect, it } from "vitest";
import { TextElement } from "../element/TextElement";
import { Frame } from "../value/Frame";
import { PageSpec } from "../value/PageSpec";
import { TextStyle } from "../value/TextStyle";
import { Template } from "./Template";
import { TemplateValidator } from "./TemplateValidator";

const page = new PageSpec("A4", "portrait", [15, 15, 15, 15]);
const style = new TextStyle("Pretendard", 10);
const validator = new TemplateValidator();

describe("TemplateValidator", () => {
  it("요소가 없는 템플릿에 오류를 반환한다", () => {
    const errors = validator.validate(createTemplate([]));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.elementId).toBeNull();
    expect(errors[0]?.message).toBe("요소가 하나도 없다");
  });

  it("같은 id를 가진 각 요소에 중복 오류를 반환한다", () => {
    const first = createTextElement("duplicate", 0);
    const second = createTextElement("duplicate", 1);

    const errors = validator.validate(createTemplate([first, second]));

    expect(errors).toHaveLength(2);
    expect(errors.every((error) => error.elementId === "duplicate")).toBe(true);
  });

  it("구조가 정상인 템플릿에는 오류를 반환하지 않는다", () => {
    const errors = validator.validate(createTemplate([
      createTextElement("title", 0),
      createTextElement("description", 1),
    ]));

    expect(errors).toEqual([]);
  });
});

/** 검증 시나리오마다 원하는 요소 목록을 가진 템플릿을 만든다. */
function createTemplate(elements: readonly TextElement[]): Template {
  return new Template({
    id: "payslip",
    name: "급여명세서",
    version: 1,
    status: "draft",
    page,
    fonts: ["Pretendard"],
    elements,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 중복 검증에서 id 외 조건이 영향을 주지 않는 텍스트 요소를 만든다. */
function createTextElement(id: string, z: number): TextElement {
  return new TextElement(
    id,
    new Frame(10, 10, 50, 10),
    z,
    false,
    { kind: "literal", value: "급여명세서" },
    style,
  );
}
