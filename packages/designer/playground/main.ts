import {
  Binding,
  BoundTableSource,
  BoxElement,
  FieldElement,
  Frame,
  LineElement,
  PageSpec,
  SignatureElement,
  TableColumn,
  TableElement,
  Template,
  TextElement,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { Designer } from "../src/index.js";

const container = document.querySelector<HTMLElement>("#designer");
if (container === null) throw new Error("디자이너 컨테이너를 찾을 수 없다");

new Designer({
  container,
  template: createTemplate(),
  fields: createFieldSchema(),
  sampleData: createSampleData(),
});

/** 현대화된 편집 화면을 바로 조작해 볼 수 있는 임금명세서 초안을 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "designer-playground",
    name: "8월 급여명세서",
    version: 3,
    status: "draft",
    page: new PageSpec("A4", "portrait", [12, 12, 12, 12]),
    fonts: ["Pretendard"],
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
    payItems: [
      { item: "기본급", amount: 4200000 },
      { item: "식대", amount: 200000 },
      { item: "야근수당", amount: 315000 },
    ],
  };
}

/** 데이터 필드 검색·배치·민감 정보 표시를 확인할 샘플 스키마를 만든다. */
function createFieldSchema() {
  return {
    employee: {
      label: "직원 정보",
      type: "array" as const,
      children: {
        name: { label: "이름", type: "string" as const },
        department: { label: "부서", type: "string" as const },
        residentNumber: {
          label: "주민등록번호", type: "string" as const, sensitive: true,
        },
      },
    },
    baseSalary: { label: "기본급", type: "currency" as const },
    payDate: { label: "지급일", type: "date" as const },
  };
}
