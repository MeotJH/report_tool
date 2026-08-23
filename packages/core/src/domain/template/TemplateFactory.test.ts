import { describe, expect, it } from "vitest";
import { BoxElement } from "../element/BoxElement";
import { FieldElement } from "../element/FieldElement";
import { ImageElement } from "../element/ImageElement";
import { LineElement } from "../element/LineElement";
import { SignatureElement } from "../element/SignatureElement";
import { TableColumn } from "../element/TableColumn";
import { TableElement } from "../element/TableElement";
import { BoundTableSource, StaticTableSource } from "../element/TableSource";
import { TextElement } from "../element/TextElement";
import { Binding } from "../value/Binding";
import { Frame } from "../value/Frame";
import { PageSpec } from "../value/PageSpec";
import { TextStyle } from "../value/TextStyle";
import { Template } from "./Template";
import { TemplateFactory } from "./TemplateFactory";

const headerStyle = new TextStyle("Pretendard", 9, { weight: 700 });
const cellStyle = new TextStyle("Pretendard", 9);

/**
 * 사용자가 편집기에서 만들 수 있는 모든 요소 종류와 두 가지 표를 담은 템플릿을 만든다.
 *
 * 왕복 검증은 한 종류만 빠져도 의미가 없으므로 7종을 모두 넣는다.
 */
function createFullTemplate(): Template {
  return new Template({
    id: "payslip",
    name: "8월 급여명세서",
    version: 3,
    status: "draft",
    page: new PageSpec("A4", "portrait", [12, 10, 12, 10]),
    fonts: ["Pretendard"],
    elements: [
      new TextElement(
        "title", new Frame(20, 18, 170, 12), 5, false,
        { kind: "literal", value: "급여명세서" },
        new TextStyle("Pretendard", 18, { weight: 700, align: "center" }),
      ),
      new TextElement(
        "greeting", new Frame(20, 32, 170, 8), 4, false,
        { kind: "template", value: "{{employee.name}} 님" }, cellStyle,
      ),
      new FieldElement(
        "net", new Frame(20, 44, 80, 9), 3, true,
        new Binding("pay.net", {
          formatSpec: { kind: "currency", currency: "KRW" },
          fallback: "0원",
          required: true,
        }),
        cellStyle,
      ),
      new TableElement(
        "earnings", new Frame(20, 60, 170, 30), 2, false,
        new BoundTableSource(new Binding("payItems")),
        [
          new TableColumn("item", "지급 항목", "{{row.item}}", 110, "left", null),
          new TableColumn("amount", "금액", "{{row.amount}}", 60, "right", {
            kind: "currency", currency: "KRW",
          }),
        ],
        7, headerStyle, cellStyle, true, "clip",
      ),
      new TableElement(
        "deductions", new Frame(20, 95, 170, 30), 2, false,
        new StaticTableSource([
          { item: "국민연금", amount: 189000 },
          { item: "건강보험", amount: 148900 },
        ]),
        [
          new TableColumn("item", "공제 항목", "{{row.item}}", 110, "left", null),
          new TableColumn("amount", "금액", "{{row.amount}}", 60, "right", null),
        ],
        7, headerStyle, cellStyle, true, "clip",
      ),
      new ImageElement("logo", new Frame(160, 14, 30, 12), 6, false, {
        assetId: "company-logo", fit: "contain",
      }),
      new ImageElement("stamp", new Frame(160, 130, 20, 20), 6, false, {
        binding: new Binding("company.stamp"), fit: "cover",
      }),
      new BoxElement("frame", new Frame(18, 16, 174, 120), 0, false, {
        fill: "#f8fafc", stroke: "#cbd5e1", strokeWidth: 0.3, radius: 2,
      }),
      new LineElement("rule", new Frame(20, 30, 170, 0), 1, false, "#334155", 0.4, [2, 2]),
      new SignatureElement(
        "sign", new Frame(130, 140, 60, 20), 7, false, "employee", true, "수령 확인",
      ),
    ],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  });
}

describe("템플릿 JSON 왕복", () => {
  it("저장한 JSON을 다시 읽어도 같은 JSON이 나온다", () => {
    const template = createFullTemplate();

    const restored = TemplateFactory.fromJSON(
      JSON.parse(JSON.stringify(template.toJSON())) as Record<string, unknown>,
    );

    expect(restored.toJSON()).toEqual(template.toJSON());
  });

  it("문서 식별 정보와 상태를 그대로 복원한다", () => {
    const template = createFullTemplate();

    const restored = TemplateFactory.fromJSON(template.toJSON());

    expect(restored.id).toBe("payslip");
    expect(restored.name).toBe("8월 급여명세서");
    expect(restored.version).toBe(3);
    expect(restored.status).toBe("draft");
    expect(restored.createdAt).toBe("2026-08-22T00:00:00.000Z");
    expect(restored.updatedAt).toBe("2026-08-23T00:00:00.000Z");
    expect(restored.fonts).toEqual(["Pretendard"]);
  });

  it("용지는 계산된 mm가 아니라 규격 이름으로 복원한다", () => {
    const template = createFullTemplate();

    const page = TemplateFactory.fromJSON(template.toJSON()).page;

    expect(page.sizeName()).toBe("A4");
    expect(page.orientationName()).toBe("portrait");
    expect(page.marginMm()).toEqual([12, 10, 12, 10]);
    expect(page.widthMm()).toBe(210);
  });

  it("일곱 종류 요소를 모두 원래 클래스로 복원한다", () => {
    const template = createFullTemplate();

    const elements = TemplateFactory.fromJSON(template.toJSON()).getElements();

    expect(elements.map((element) => element.type)).toEqual([
      "text", "text", "field", "table", "table",
      "image", "image", "box", "line", "signature",
    ]);
  });

  it("사용자가 입력한 정적 표의 셀 값이 그대로 남는다", () => {
    const template = createFullTemplate();

    const restored = TemplateFactory.fromJSON(template.toJSON());
    const deductions = restored.getElements()
      .find((element) => element.id === "deductions") as TableElement;

    expect(deductions.source).toBeInstanceOf(StaticTableSource);
    expect(deductions.source.resolveRows({})).toEqual([
      { item: "국민연금", amount: 189000 },
      { item: "건강보험", amount: 148900 },
    ]);
  });

  it("데이터 표는 배열 경로를 유지해 행 수가 데이터에 따라 정해진다", () => {
    const template = createFullTemplate();

    const restored = TemplateFactory.fromJSON(template.toJSON());
    const earnings = restored.getElements()
      .find((element) => element.id === "earnings") as TableElement;

    expect(earnings.source).toBeInstanceOf(BoundTableSource);
    expect(earnings.source.resolveRows({ payItems: [{ item: "기본급" }] }))
      .toEqual([{ item: "기본급" }]);
  });

  it("사용자가 정한 헤더와 열 표현을 유지한다", () => {
    const template = createFullTemplate();

    const restored = TemplateFactory.fromJSON(template.toJSON());
    const earnings = restored.getElements()
      .find((element) => element.id === "earnings") as TableElement;

    expect(earnings.columns.map((column) => column.header))
      .toEqual(["지급 항목", "금액"]);
    expect(earnings.columns[1]?.align).toBe("right");
    expect(earnings.columns[1]?.formatSpec).toEqual({ kind: "currency", currency: "KRW" });
    expect(earnings.showHeader).toBe(true);
    expect(earnings.rowHeight).toBe(7);
  });

  it("잠금·숨김과 쌓임 순서를 유지한다", () => {
    const template = createFullTemplate()
      .replaceElement("frame", (element) => element.withHidden(true));

    const restored = TemplateFactory.fromJSON(template.toJSON());

    expect(restored.getElements().find((element) => element.id === "net")?.locked).toBe(true);
    expect(restored.getElements().find((element) => element.id === "frame")?.hidden).toBe(true);
    expect(restored.getElements().find((element) => element.id === "sign")?.z).toBe(7);
  });

  it("고정 이미지와 데이터 이미지의 출처를 구분해 복원한다", () => {
    const template = createFullTemplate();

    const elements = TemplateFactory.fromJSON(template.toJSON()).getElements();
    const logo = elements.find((element) => element.id === "logo") as ImageElement;
    const stamp = elements.find((element) => element.id === "stamp") as ImageElement;

    expect(logo.assetId).toBe("company-logo");
    expect(logo.binding).toBeUndefined();
    expect(stamp.assetId).toBeUndefined();
    expect(stamp.binding?.path.toString()).toBe("company.stamp");
  });

  it("복원한 템플릿을 이어서 편집할 수 있다", () => {
    const restored = TemplateFactory.fromJSON(createFullTemplate().toJSON());

    const edited = restored.removeElement("rule");

    expect(edited.getElements()).toHaveLength(9);
  });

  it("schemaVersion이 없으면 열지 않는다", () => {
    const json = createFullTemplate().toJSON();
    delete json.schemaVersion;

    expect(() => TemplateFactory.fromJSON(json))
      .toThrow("템플릿 저장 데이터에 schemaVersion이 없다");
  });

  it("해석할 수 없는 schemaVersion은 거부한다", () => {
    const json = { ...createFullTemplate().toJSON(), schemaVersion: 2 };

    expect(() => TemplateFactory.fromJSON(json))
      .toThrow("지원하지 않는 템플릿 schemaVersion 2이다");
  });
});
