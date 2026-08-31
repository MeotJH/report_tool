import {
  Binding,
  ElementFollow,
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
  TextElement,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { TemplateIssueFinder } from "./TemplateIssueFinder.js";

/** 폰트 없이도 결과가 일정하도록 글자 수에 비례하는 폭을 쓴다. */
const measureWidth = (text: string, size: number): number => text.length * size * 0.5;

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
    [new TableColumn("item", "항목", "{{row.item}}", 60, "left", null)],
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

  it("고정 문구에 남은 데이터 표현식을 알린다", () => {
    // 리포트 표지에서 실제로 코드 그대로 발행된 자리다.
    const cover = new TextElement(
      "cover", new Frame(20, 20, 100, 10), 0, false,
      { kind: "literal", value: "-{{customer.shortName}}-" },
      new TextStyle("Pretendard", 12),
    );

    const issues = finder.find(createTemplate(cover));

    expect(issues.map((issue) => issue.message)).toEqual([
      '고정 문구에 데이터 표현식이 남아 있다: {{customer.shortName}} (종류를 "데이터 문구"로 바꾸세요)',
    ]);
  });

  it("쪽 번호는 고정 문구에서도 채워지므로 지적하지 않는다", () => {
    const pageNumber = new TextElement(
      "page-number", new Frame(160, 8, 35, 5), 0, false,
      { kind: "literal", value: "{{page:00}} / {{pages:00}}" },
      new TextStyle("Pretendard", 8),
    );

    const issues = finder.find(createTemplate(pageNumber));

    expect(issues).toEqual([]);
  });

  it("자릿수를 적지 않은 쪽 번호도 지적하지 않는다", () => {
    const pageNumber = new TextElement(
      "page-number", new Frame(160, 8, 35, 5), 0, false,
      { kind: "literal", value: "{{page}} / {{pages}}" },
      new TextStyle("Pretendard", 8),
    );

    const issues = finder.find(createTemplate(pageNumber));

    expect(issues).toEqual([]);
  });

  it("데이터 문구는 지적하지 않는다", () => {
    const declared = new TextElement(
      "greeting", new Frame(20, 20, 100, 10), 0, false,
      { kind: "template", value: "{{employee.name}} 귀하" },
      new TextStyle("Pretendard", 12),
    );

    const issues = finder.find(createTemplate(declared))
      .filter((issue) => issue.message.includes("고정 문구"));

    expect(issues).toEqual([]);
  });

  it("표가 자리를 넘어 다음 쪽으로 이어지는 것을 알린다", () => {
    // 30mm 표에 행 높이 7mm — 머리글까지 네 줄만 들어가고 나머지는 사라진다.
    const rows = new BoundTableSource(new Binding("payItems"));
    const data = {
      payItems: [
        { item: "기본급" }, { item: "식대" }, { item: "야근수당" },
        { item: "직책수당" }, { item: "상여" },
      ],
    };

    const issues = new TemplateIssueFinder([], null, data)
      .find(createTemplate(table("pay", rows)));

    expect(issues.map((issue) => issue.message))
      .toContain("표가 자리를 넘어 2줄이 다음 쪽으로 이어진다 (편집 화면에는 첫 쪽만 보입니다)");
  });

  it("표에 다 들어가면 이어짐을 알리지 않는다", () => {
    const rows = new BoundTableSource(new Binding("payItems"));
    const data = { payItems: [{ item: "기본급" }, { item: "식대" }] };

    const issues = new TemplateIssueFinder([], null, data)
      .find(createTemplate(table("pay", rows)));

    expect(issues.filter((issue) => issue.message.includes("이어진다"))).toEqual([]);
  });

  it("열 너비 합이 표 너비와 다르면 경고한다", () => {
    const style = new TextStyle("Pretendard", 9);
    const narrow = new TableElement(
      "t", new Frame(20, 20, 60, 30), 0, false, new StaticTableSource([{ item: "가" }]),
      [new TableColumn("item", "항목", "{{row.item}}", 90, "left", null)],
      7, style, style, true, "clip",
    );

    const issues = finder.find(createTemplate(narrow));

    expect(issues.map((issue) => issue.message))
      .toEqual(["열 너비 합 90mm가 표 너비 60mm와 다르다"]);
  });

  it("문구가 요소 높이보다 길면 경고한다", () => {
    const wordy = new TextElement(
      "long", new Frame(20, 20, 20, 6), 0, false,
      { kind: "literal", value: "가 나 다 라 마 바 사 아 자 차 카 타" },
      new TextStyle("Pretendard", 10),
    );

    const issues = new TemplateIssueFinder([], () => measureWidth).find(createTemplate(wordy));

    expect(issues.map((issue) => issue.message))
      .toEqual([expect.stringContaining("요소 높이보다 길다")]);
  });

  it("측정기를 주지 않으면 넘침을 판단하지 않는다", () => {
    const wordy = new TextElement(
      "long", new Frame(20, 20, 20, 6), 0, false,
      { kind: "literal", value: "가 나 다 라 마 바 사 아 자 차 카 타" },
      new TextStyle("Pretendard", 10),
    );

    expect(new TemplateIssueFinder().find(createTemplate(wordy))).toEqual([]);
  });

  it("영역 안에 들어가는 문구는 경고하지 않는다", () => {
    const short = new TextElement(
      "short", new Frame(20, 20, 60, 10), 0, false,
      { kind: "literal", value: "이름" }, new TextStyle("Pretendard", 10),
    );

    const issues = new TemplateIssueFinder([], () => measureWidth).find(createTemplate(short));

    expect(issues).toEqual([]);
  });

  describe("따라갈 표 연결", () => {
    /** 표를 따라다니겠다고 선언한 캡션을 만든다. */
    function caption(follows: string, pageIndex = 0): TextElement {
      return new TextElement(
        "caption", new Frame(20, 12, 60, 6), 0, false,
        { kind: "literal", value: "처리내역 (상세)" },
        new TextStyle("Pretendard", 10), false, pageIndex, false,
        ElementFollow.caption(follows),
      );
    }

    it("따라갈 표가 없어졌으면 경고한다", () => {
      const issues = finder.find(createTemplate(
        table("tickets", new BoundTableSource(new Binding("tickets"))),
        caption("gone"),
      ));

      expect(issues).toEqual([
        { elementId: "caption", severity: "warning", message: "따라갈 표 gone를 찾을 수 없다" },
      ]);
    });

    it("표가 아닌 요소를 따라가면 경고한다", () => {
      const issues = finder.find(createTemplate(
        new BoxElement("box", new Frame(20, 20, 40, 20), 0, false),
        caption("box"),
      ));

      expect(issues).toEqual([
        { elementId: "caption", severity: "warning", message: "표가 아닌 요소는 따라갈 수 없다" },
      ]);
    });

    it("다른 쪽의 표를 따라가면 경고한다", () => {
      const issues = finder.find(createTemplate(
        table("tickets", new BoundTableSource(new Binding("tickets"))),
        caption("tickets", 1),
      ));

      expect(issues).toEqual([
        {
          elementId: "caption",
          severity: "warning",
          message: "따라갈 표가 다른 쪽에 있어 함께 가지 않는다",
        },
      ]);
    });

    it("같은 쪽의 표를 따라가면 아무 문제도 알리지 않는다", () => {
      const issues = finder.find(createTemplate(
        table("tickets", new BoundTableSource(new Binding("tickets"))),
        caption("tickets"),
      ));

      expect(issues).toEqual([]);
    });
  });

  it("정상 요소만 있으면 아무 문제도 알리지 않는다", () => {
    const issues = finder.find(createTemplate(
      new BoxElement("ok", new Frame(20, 20, 40, 20), 0, false),
    ));

    expect(issues).toEqual([]);
  });
});
