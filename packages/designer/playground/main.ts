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
  TemplateFactory,
  TemplateVariable,
  TextElement,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { Designer } from "../src/index.js";
// 발행본과 같은 템플릿을 편집기에도 올려 "화면 = 발행본"을 눈으로 확인한다.
// 픽스처는 core만 참조하므로 이 import가 PDF 렌더러를 끌고 오지 않는다.
import {
  createServiceReportData,
  createServiceReportTemplate,
} from "../../renderer/src/pdf/ServiceReportTestFixture.js";
// 발행 스크립트가 읽는 것과 **같은 파일**을 편집기도 읽는다. 저장된 양식이
// 화면에서 그대로 열리는지는 이 경로로만 확인된다.
import savedServiceReport from "../../../apps/poc/service-report/template.json";

const container = document.querySelector<HTMLElement>("#designer");
if (container === null) throw new Error("디자이너 컨테이너를 찾을 수 없다");

/**
 * 발행 렌더러에 넘기는 것과 같은 TTF 파일을 편집기에도 공급한다.
 *
 * 호스트가 실제로 해야 하는 일이 이것이다. 이름만 넘기면 편집기는 보는 사람
 * 컴퓨터에 깔린 글꼴로 재고, 그 폭은 발행본이 임베딩하는 파일과 다르다.
 */
class PlaygroundFontProvider implements FontProvider {
  /** 가족 이름에 맞는 파일을 받아 바이트로 돌려준다. */
  async load(family: string, weight: number): Promise<Uint8Array> {
    const response = await fetch(PlaygroundFontProvider.urlFor(family, weight));
    if (!response.ok) throw new Error(`글꼴 파일을 받지 못했다: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  /** 리포트는 원본이 임베딩한 맑은 고딕을, 나머지는 Pretendard를 쓴다. */
  private static urlFor(family: string, weight: number): string {
    const bold = weight >= 700;
    if (family === "MalgunGothic") return bold ? "/malgunbd.ttf" : "/malgun.ttf";
    return bold ? boldFontUrl : regularFontUrl;
  }
}

/**
 * 어떤 문서로 편집기를 열지 주소로 고른다.
 *
 * `report`는 코드가 만든 완성본, `saved`는 그것을 저장한 **JSON 파일**을 다시 읽은
 * 것, `blank`는 요소도 변수도 없는 백지다. `saved`가 열리는지가 "저장한 것이
 * 그대로 열린다"의 확인이다.
 * 백지를 따로 두는 이유는, 완성본을 손보는 것과 아무것도 없는 데서 만드는 것이
 * 전혀 다른 일이기 때문이다. 후자에서만 드러나는 구멍이 있다.
 */
const documentKind = new URLSearchParams(location.search).get("doc") ?? "payslip";

/**
 * 백지 작업을 브라우저에 남겨 새로고침에도 살아남게 한다.
 *
 * 라이브러리는 I/O를 하지 않는다 — 저장은 호스트의 일이다. 이 클래스가 하는 일이
 * 호스트가 실제로 해야 하는 일의 전부다: `getTemplate().toJSON()`을 어딘가 넣고,
 * 열 때 `TemplateFactory.fromJSON()`으로 되돌린다.
 *
 * 여기서는 그 어딘가가 `localStorage`다. 한 쪽짜리 양식이면 없어도 되지만, 요소
 * 스무 개짜리 문서를 만드는 동안 창이 한 번 닫히면 하루가 사라진다.
 */
class BlankDraftStore {
  /** 다른 문서와 섞이지 않도록 백지 초안만의 자리를 쓴다. */
  private static readonly KEY = "report-tool.blank-draft";

  /** 저장해 둔 초안을 되살린다. 없거나 깨졌으면 null이다. */
  load(): Template | null {
    const saved = localStorage.getItem(BlankDraftStore.KEY);
    if (saved === null) return null;
    try {
      return TemplateFactory.fromJSON(JSON.parse(saved) as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  /** 편집 결과를 즉시 남긴다. 저장 버튼을 누르는 순간을 기다리지 않는다. */
  save(template: Template): void {
    localStorage.setItem(BlankDraftStore.KEY, JSON.stringify(template.toJSON()));
  }

  /** 처음부터 다시 시작할 수 있게 비운다. */
  clear(): void {
    localStorage.removeItem(BlankDraftStore.KEY);
  }
}

const blankDrafts = new BlankDraftStore();
if (new URLSearchParams(location.search).get("fresh") === "1") blankDrafts.clear();

new Designer({
  container,
  template: createTemplateFor(documentKind),
  sampleData: documentKind === "payslip" ? createSampleData() : createServiceReportData(),
  fontProvider: new PlaygroundFontProvider(),
  onChange: (template) => {
    showSavedJson(template);
    if (documentKind === "blank") blankDrafts.save(template);
  },
});

/** 주소로 고른 종류에 맞는 시작 템플릿을 준다. */
function createTemplateFor(kind: string): Template {
  if (kind === "report") return createServiceReportTemplate();
  if (kind === "saved") return TemplateFactory.fromJSON(savedServiceReport);
  if (kind === "blank") return blankDrafts.load() ?? createBlankTemplate();
  return createTemplate();
}

/**
 * 요소도 변수도 없는 백지 한 장을 만든다.
 *
 * 쪽 규격과 여백은 A4 기본값으로 둔다. 원본 리포트의 여백(11.36·10.01·14.95·10.16)을
 * 미리 넣어 주면 "백지에서 만들 수 있는가"를 확인할 수 없다 — 그 값을 사람이 속성
 * 패널에서 넣을 수 있는지도 확인 대상이다.
 *
 * 글꼴은 두 가족을 다 올린다. 원본은 맑은 고딕으로 만들어졌고, Pretendard는 그
 * 밖의 문서가 쓴다. 편집기가 실제로 잴 파일을 미리 받아 두어야 화면 줄바꿈이
 * 발행본과 같아진다.
 */
function createBlankTemplate(): Template {
  const now = new Date().toISOString();
  return new Template({
    id: "blank-document",
    name: "제목 없는 문서",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [12, 12, 12, 12]),
    fonts: ["MalgunGothic", "Pretendard"],
    variables: [],
    elements: [],
    createdAt: now,
    updatedAt: now,
  });
}

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
