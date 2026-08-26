import type { FontProvider } from "@report-tool/core";
import regularFontUrl from "pretendard/dist/public/static/alternative/Pretendard-Regular.ttf?url";
import boldFontUrl from "pretendard/dist/public/static/alternative/Pretendard-Bold.ttf?url";
import {
  Binding,
  BoundTableSource,
  BoxElement,
  FieldElement,
  Frame,
  LineElement,
  PageSpec,
  SignatureElement,
  StaticTableSource,
  TableColumn,
  TableElement,
  TableHeaderCells,
  Template,
  TemplateVariable,
  TextElement,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { Designer } from "../src/index.js";

const container = document.querySelector<HTMLElement>("#designer");
if (container === null) throw new Error("디자이너 컨테이너를 찾을 수 없다");

/**
 * 발행 렌더러에 넘기는 것과 같은 TTF 파일을 편집기에도 공급한다.
 *
 * 호스트가 실제로 해야 하는 일이 이것이다. 이름만 넘기면 편집기는 보는 사람
 * 컴퓨터에 깔린 글꼴로 재고, 그 폭은 발행본이 임베딩하는 파일과 다르다.
 */
class PlaygroundFontProvider implements FontProvider {
  /** 굵기에 맞는 파일을 받아 바이트로 돌려준다. */
  async load(_family: string, weight: number): Promise<Uint8Array> {
    const response = await fetch(weight >= 700 ? boldFontUrl : regularFontUrl);
    if (!response.ok) throw new Error(`글꼴 파일을 받지 못했다: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}

new Designer({
  container,
  template: createTemplate(),
  sampleData: createSampleData(),
  fontProvider: new PlaygroundFontProvider(),
  onChange: (template) => showSavedJson(template),
});

/**
 * 편집 결과가 저장 가능한 JSON으로 즉시 바뀌는 것을 눈으로 확인하게 한다.
 *
 * 호스트가 실제로 하는 일이 이것뿐이라는 점을 드러내기 위해, 라이브러리가 주는
 * 템플릿을 그대로 문자열로 만들어 화면 아래에 보여준다.
 */
function showSavedJson(template: Template): void {
  const output = document.querySelector<HTMLElement>("#saved-json");
  if (output === null) return;
  output.textContent = JSON.stringify(template.toJSON(), null, 2);
}

/** 현대화된 편집 화면을 바로 조작해 볼 수 있는 임금명세서 초안을 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "designer-playground",
    name: "8월 급여명세서",
    version: 3,
    status: "draft",
    page: new PageSpec("A4", "portrait", [12, 12, 12, 12]),
    fonts: ["Pretendard"],
    variables: createVariables(),
    elements: createElements(),
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** Playground 문서에 제목·정보 상자·데이터 필드·표·서명을 배치한다. */
function createElements(): readonly Element[] {
  const titleStyle = new TextStyle("Pretendard", 18, { weight: 700 });
  const labelStyle = new TextStyle("Pretendard", 9, { color: "#64748b" });
  const fieldStyle = new TextStyle("Pretendard", 11, { color: "#1e293b" });
  const headerStyle = new TextStyle("Pretendard", 9, { weight: 700 });
  const cellStyle = new TextStyle("Pretendard", 9);
  return [
    new TextElement(
      "title", new Frame(20, 18, 170, 12), 3, false,
      { kind: "literal", value: "급여명세서" }, titleStyle,
    ),
    new LineElement("rule", new Frame(20, 32, 170, 0), 2, false, "#334155", 0.4),
    new BoxElement("info", new Frame(20, 40, 170, 26), 1, false, {
      fill: "#f8fafc", stroke: "#cbd5e1", strokeWidth: 0.3, radius: 2,
    }),
    new TextElement(
      "name-label", new Frame(26, 45, 20, 5), 3, false,
      { kind: "literal", value: "이름" }, labelStyle,
    ),
    new FieldElement(
      "name", new Frame(26, 51, 60, 8), 3, false,
      new Binding("employee.name", { fallback: "홍길동" }), fieldStyle,
    ),
    new TextElement(
      "dept-label", new Frame(110, 45, 20, 5), 3, false,
      { kind: "literal", value: "부서" }, labelStyle,
    ),
    new FieldElement(
      "department", new Frame(110, 51, 60, 8), 3, false,
      new Binding("employee.department", { fallback: "개발팀" }), fieldStyle,
    ),
    new TableElement(
      "period-table", new Frame(20, 64, 170, 8), 3, false,
      new StaticTableSource([
        { label: "기간", value: "{{period.start}} ~ {{period.end}}" },
      ]),
      [
        new TableColumn("label", "구분", "{{row.label}}", 40, "center", null),
        new TableColumn("value", "값", "{{row.value}}", 130, "left", null),
      ],
      8, headerStyle, cellStyle, false, "clip", false,
      new TableHeaderCells([0]),
    ),
    new TableElement(
      "pay-table", new Frame(20, 76, 170, 35), 3, false,
      new BoundTableSource(new Binding("payItems")),
      [
        new TableColumn("item", "항목", "{{row.item}}", 110, "left", null),
        new TableColumn("amount", "금액", "{{row.amount}}", 60, "right", {
          kind: "currency", currency: "KRW",
        }),
      ],
      7, headerStyle, cellStyle, true, "clip",
    ),
    new SignatureElement(
      "sign", new Frame(130, 125, 60, 20), 3, false, "employee", true, "수령 확인",
    ),
  ];
}

/** 미리보기 모드에서 실제로 무엇이 찍히는지 확인할 샘플 데이터를 만든다. */
function createSampleData(): unknown {
  return {
    employee: { name: "김지훈", department: "플랫폼개발팀", residentNumber: "9001011234567" },
    baseSalary: 4200000,
    payDate: "2026-08-25",
    period: { start: "2026.07.01", end: "2026.07.31" },
    payItems: [
      { item: "기본급", amount: 4200000 },
      { item: "식대", amount: 200000 },
      { item: "야근수당", amount: 315000 },
    ],
    deductionItems: [
      { item: "국민연금", amount: 189000 },
      { item: "건강보험", amount: 148900 },
      { item: "고용보험", amount: 37800 },
      { item: "소득세", amount: 132000 },
    ],
  };
}

/** 이 문서가 발행 시 요구하는 데이터를 템플릿 자신이 선언하게 한다. */
function createVariables(): readonly TemplateVariable[] {
  return [
    new TemplateVariable("period", "기간", "array"),
    new TemplateVariable("period.start", "시작일", "date", true),
    new TemplateVariable("period.end", "종료일", "date", true),
    new TemplateVariable("employee", "직원 정보", "array"),
    new TemplateVariable("employee.name", "이름", "string", true),
    new TemplateVariable("employee.department", "부서", "string"),
    new TemplateVariable("employee.residentNumber", "주민등록번호", "string"),
    new TemplateVariable("payItems", "지급 항목", "array"),
    new TemplateVariable("payItems.item", "항목", "string"),
    new TemplateVariable("payItems.amount", "금액", "currency"),
    new TemplateVariable("baseSalary", "기본급", "currency", true),
    new TemplateVariable("payDate", "지급일", "date", true),
  ];
}
