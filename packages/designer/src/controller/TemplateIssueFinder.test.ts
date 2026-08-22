import {
  Binding,
  BoundTableSource,
  BoxElement,
  Frame,
  ImageElement,
  PageSpec,
  SignatureElement,
  StaticTableSource,
  TableColumn,
  TableElement,
  Template,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { TemplateIssueFinder } from "./TemplateIssueFinder.js";

/** 문제 탐색만 검증하도록 요소를 담은 초안을 만든다. */
function createTemplate(...elements: readonly Element[]): Template {
  return new Template({
    id: "t", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 정적·데이터 표를 짧게 만들기 위한 공통 열 구성이다. */
function table(id: string, source: StaticTableSource | BoundTableSource): TableElement {
  const style = new TextStyle("Pretendard", 9);
  return new TableElement(
    id, new Frame(20, 20, 60, 30), 0, false, source,
    [new TableColumn("item", "항목", "{{row.item}}", 30, "left", null)],
    7, style, style, true, "clip",
  );
}

describe("TemplateIssueFinder", () => {
  const finder = new TemplateIssueFinder();

  it("요소가 없는 템플릿은 core 검증 오류를 그대로 알린다", () => {
    const issues = finder.find(createTemplate());

    expect(issues).toEqual([
      { elementId: null, severity: "error", message: "요소가 하나도 없다" },
    ]);
  });

  it("페이지를 벗어난 요소를 경고한다", () => {
    const issues = finder.find(createTemplate(
      new BoxElement("out", new Frame(180, 10, 60, 10), 0, false),
    ));

    expect(issues).toEqual([
      { elementId: "out", severity: "warning", message: "요소가 페이지 밖으로 벗어났다" },
    ]);
  });

  it("음수 좌표도 페이지 이탈로 본다", () => {
    const issues = finder.find(createTemplate(
      new BoxElement("out", new Frame(-5, 10, 20, 10), 0, false),
    ));

    expect(issues).toHaveLength(1);
  });

  it("출처가 비어 있는 이미지를 경고한다", () => {
    const issues = finder.find(createTemplate(
      new ImageElement("image", new Frame(20, 20, 20, 20), 0, false, { assetId: "" }),
    ));

    expect(issues.map((issue) => issue.message))
      .toEqual(["이미지 출처가 지정되지 않았다"]);
  });

  it("출처가 있는 이미지는 경고하지 않는다", () => {
    const issues = finder.find(createTemplate(
      new ImageElement("image", new Frame(20, 20, 20, 20), 0, false, { assetId: "logo" }),
    ));

    expect(issues).toEqual([]);
  });

  it("서명자가 빈 서명 자리를 경고한다", () => {
    const issues = finder.find(createTemplate(
      new SignatureElement("sign", new Frame(20, 20, 40, 15), 0, false, ""),
    ));

    expect(issues.map((issue) => issue.message)).toEqual(["서명자가 지정되지 않았다"]);
  });

  it("행이 없는 정적 표를 경고한다", () => {
    const issues = finder.find(createTemplate(table("t", new StaticTableSource([]))));

    expect(issues.map((issue) => issue.message)).toEqual(["표에 입력된 행이 없다"]);
  });

  it("데이터 표는 발행 시 행이 채워지므로 빈 상태를 경고하지 않는다", () => {
    const issues = finder.find(createTemplate(
      table("t", new BoundTableSource(new Binding("items"))),
    ));

    expect(issues).toEqual([]);
  });

  it("정상 요소만 있으면 아무 문제도 알리지 않는다", () => {
    const issues = finder.find(createTemplate(
      new BoxElement("ok", new Frame(20, 20, 40, 20), 0, false),
    ));

    expect(issues).toEqual([]);
  });
});
