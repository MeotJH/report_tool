import { describe, expect, it } from "vitest";
import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { PageSpec } from "../value/PageSpec.js";
import { TextStyle } from "../value/TextStyle.js";
import { FieldElement } from "../element/FieldElement.js";
import { TableColumn } from "../element/TableColumn.js";
import { TableElement } from "../element/TableElement.js";
import { BoundTableSource, StaticTableSource } from "../element/TableSource.js";
import { TextElement } from "../element/TextElement.js";
import type { Element } from "../element/Element.js";
import { Template } from "./Template.js";
import { TemplateReferences } from "./TemplateReferences.js";

const style = new TextStyle("Pretendard", 10);

/** 참조 수집만 검증하도록 요소를 담은 초안을 만든다. */
function createTemplate(...elements: readonly Element[]): Template {
  return new Template({
    id: "t", name: "문서", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  });
}

/** 열 구성이 같은 표를 Source만 바꿔 만든다. */
function table(source: StaticTableSource | BoundTableSource): TableElement {
  return new TableElement(
    "pay", new Frame(20, 20, 60, 30), 0, false, source,
    [
      new TableColumn("item", "항목", "{{row.item}}", 30, "left", null),
      new TableColumn("amount", "금액", "{{row.amount}}", 30, "right", null),
    ],
    7, style, style, true, "clip",
  );
}

describe("TemplateReferences", () => {
  const references = new TemplateReferences();

  it("필드 바인딩 경로를 모은다", () => {
    const element = new FieldElement(
      "f", new Frame(0, 0, 10, 5), 0, false, new Binding("employee.name"), style,
    );

    expect(references.collect(createTemplate(element)))
      .toEqual([{ elementId: "f", path: "employee.name" }]);
  });

  it("데이터 문구 안의 경로를 모은다", () => {
    const element = new TextElement(
      "t", new Frame(0, 0, 10, 5), 0, false,
      { kind: "template", value: "{{company.name}} 귀중" }, style,
    );

    expect(references.collect(createTemplate(element)).map((one) => one.path))
      .toEqual(["company.name"]);
  });

  it("데이터 표의 배열 경로를 모으고 행 안의 키는 제외한다", () => {
    const element = table(new BoundTableSource(new Binding("payItems")));

    expect(references.collect(createTemplate(element)).map((one) => one.path))
      .toEqual(["payItems"]);
  });

  it("정적 셀에 적은 표현식의 경로도 모은다", () => {
    const element = table(new StaticTableSource([
      { item: "기본급", amount: "{{pay.base}}" },
      { item: "식대", amount: "{{pay.meal}}" },
    ]));

    expect(references.collect(createTemplate(element)).map((one) => one.path))
      .toEqual(["pay.base", "pay.meal"]);
  });

  it("정적 셀의 고정 문구는 참조로 보지 않는다", () => {
    const element = table(new StaticTableSource([{ item: "기본급", amount: 4200000 }]));

    expect(references.collect(createTemplate(element))).toEqual([]);
  });
});
