import { describe, expect, it } from "vitest";
import { ContentResolver } from "./ContentResolver";
import { TemplateExpression } from "./TemplateExpression";

describe("TemplateExpression", () => {
  it("템플릿의 데이터 경로를 실제 값으로 치환한다", () => {
    const result = TemplateExpression.render("{{a.b}} 님", {
      a: { b: "김정환" },
    });

    expect(result).toBe("김정환 님");
  });

  it("데이터 경로가 없으면 빈 문자열로 치환한다", () => {
    expect(TemplateExpression.render("{{x.y}}", {})).toBe("");
  });

  it("템플릿 표현식이 없으면 원본을 그대로 반환한다", () => {
    expect(TemplateExpression.render("임금명세서", {})).toBe("임금명세서");
  });
});

describe("ContentResolver", () => {
  it("고정 문구는 데이터와 관계없이 그대로 반환한다", () => {
    const result = ContentResolver.resolve(
      { kind: "literal", value: "임금명세서" },
      { employee: { name: "김정환" } },
    );

    expect(result).toBe("임금명세서");
  });

  it("템플릿 문구는 데이터가 적용된 결과를 반환한다", () => {
    const result = ContentResolver.resolve(
      { kind: "template", value: "{{employee.name}} 님" },
      { employee: { name: "김정환" } },
    );

    expect(result).toBe("김정환 님");
  });
});
