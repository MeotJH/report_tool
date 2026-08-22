import { describe, expect, it } from "vitest";
import {
  Binding,
  BindingResolver,
  FieldElement,
  Frame,
  PageSpec,
  TableColumn,
  TableElement,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";
import { UsedCharCollector } from "./UsedCharCollector";

describe("UsedCharCollector", () => {
  it("텍스트·필드·표에 실제로 표시될 모든 문자를 중복 없이 수집한다", () => {
    const data = {
      employee: { name: "홍길동" },
      items: [
        { name: "기본급", amount: 3_800_000 },
        { name: "식대", amount: 200_000 },
      ],
    };
    const collector = new UsedCharCollector(data, new BindingResolver());

    const characters = collector.collect(createTemplate());

    for (const expected of "급여홍길동항목금액기본급3800000원식대200000") {
      expect(characters).toContain(expected);
    }
    expect(new Set([...characters]).size).toBe([...characters].length);
  });
});

/** 문자 수집 경로 세 가지를 한 문서에서 함께 검증할 템플릿을 만든다. */
function createTemplate(): Template {
  const style = new TextStyle("Pretendard", 10);
  const elements = [
    new TextElement(
      "title", new Frame(10, 10, 50, 10), 0, false,
      { kind: "literal", value: "급여" }, style,
    ),
    new FieldElement(
      "name", new Frame(10, 20, 50, 10), 1, false,
      new Binding("employee.name"), style,
    ),
    new TableElement(
      "items", new Frame(10, 30, 100, 40), 2, false,
      new Binding("items"),
      [
        new TableColumn("name", "항목", "{{row.name}}", 50, "left", null),
        new TableColumn("amount", "금액", "{{row.amount}}원", 50, "right", null),
      ],
      6, style, style, true, "clip",
    ),
  ];
  return new Template({
    id: "payslip",
    name: "급여명세서",
    version: 1,
    status: "published",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"],
    elements,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}
