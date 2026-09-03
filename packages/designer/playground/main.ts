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
  type ImageAsset,
  type ImageLibrary,
  type TemplateLibrary,
  type TemplateSummary,
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
 * 만든 양식을 브라우저에 보관한다. 호스트가 해야 할 일의 전부를 보여 준다.
 *
 * 라이브러리는 I/O를 하지 않는다 — 급여 데이터가 고객사 밖으로 나가면 안 되므로
 * 어디에 저장할지는 호스트만 정할 수 있다. 그 자리에 들어가는 것이 이 클래스이고,
 * 하는 일은 셋뿐이다: `toJSON()`을 어딘가 넣고, 목록을 보여 주고,
 * `TemplateFactory.fromJSON()`으로 되돌린다.
 *
 * 여기서는 그 어딘가가 `localStorage`다. 실제 호스트라면 사내 DB가 그 자리에 온다.
 */
class LocalStorageTemplateLibrary implements TemplateLibrary {
  /** 보관한 양식을 한 자리에 모아 둔다. 키가 흩어지면 목록을 만들 수 없다. */
  private static readonly KEY = "report-tool.templates";

  /** 최근에 고친 것이 위로 오게 한다. 방금 저장한 것을 찾느라 훑지 않게. */
  async list(): Promise<readonly TemplateSummary[]> {
    return Object.values(this.read())
      .map((saved) => ({
        id: String(saved["id"]),
        name: String(saved["name"]),
        updatedAt: String(saved["updatedAt"]),
      }))
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  }

  /** 저장해 둔 JSON을 편집할 수 있는 템플릿으로 되돌린다. */
  async load(id: string): Promise<Template> {
    const saved = this.read()[id];
    if (saved === undefined) throw new Error(`보관소에 ${id}가 없다`);
    return TemplateFactory.fromJSON(saved);
  }

  /** 같은 식별자 자리에 덮어 넣는다. */
  async save(template: Template): Promise<void> {
    const all = this.read();
    all[template.id] = template.toJSON();
    localStorage.setItem(LocalStorageTemplateLibrary.KEY, JSON.stringify(all));
  }

  /** 처음부터 다시 시작할 수 있게 비운다. */
  clear(): void {
    localStorage.removeItem(LocalStorageTemplateLibrary.KEY);
  }

  /** 저장된 것이 없거나 깨졌으면 빈 보관소로 다룬다. */
  private read(): Record<string, Record<string, unknown>> {
    const saved = localStorage.getItem(LocalStorageTemplateLibrary.KEY);
    if (saved === null) return {};
    try {
      return JSON.parse(saved) as Record<string, Record<string, unknown>>;
    } catch {
      return {};
    }
  }
}

/**
 * 로고·직인을 브라우저에 보관한다. 호스트가 해야 할 일의 전부를 보여 준다.
 *
 * 편집기와 발행 렌더러가 **같은 포트**를 쓰므로, 실제 호스트라면 이 자리에 사내
 * 파일 서버가 오고 서버 쪽 발행도 같은 객체로 그림을 받는다.
 *
 * `localStorage`는 문자열만 담으므로 바이트를 base64로 바꿔 넣는다. 그래서 용량이
 * 4/3으로 늘고 브라우저 한도(대개 5MB)에 금방 닿는다 — 데모라서 그대로 두되,
 * 넘치면 조용히 넘어가지 않고 사람이 읽을 수 있는 말로 알린다.
 */
class LocalStorageImageLibrary implements ImageLibrary {
  /** 보관한 그림을 한 자리에 모아 둔다. */
  private static readonly KEY = "report-tool.images";

  /** 저장된 그림을 발행 렌더러가 쓰는 형태 그대로 돌려준다. */
  async load(assetId: string): Promise<ImageAsset> {
    const saved = this.read()[assetId];
    if (saved === undefined) throw new Error(`보관소에 그림 ${assetId}가 없다`);
    return { bytes: LocalStorageImageLibrary.decode(saved.base64), mediaType: saved.mediaType };
  }

  /**
   * 파일 이름을 그대로 식별자로 쓴다.
   *
   * 같은 이름을 다시 올리면 덮어쓴다. 무작위 식별자를 붙이면 같은 로고를 두 번
   * 올린 사람이 보관소에서 어느 것이 쓰이는지 구별할 수 없다.
   */
  async upload(asset: ImageAsset, fileName: string): Promise<string> {
    const all = this.read();
    all[fileName] = {
      base64: LocalStorageImageLibrary.encode(asset.bytes),
      mediaType: asset.mediaType,
    };
    try {
      localStorage.setItem(LocalStorageImageLibrary.KEY, JSON.stringify(all));
    } catch {
      throw new Error("브라우저 저장 공간이 가득 찼습니다. 더 작은 그림을 쓰세요");
    }
    return fileName;
  }

  /** 처음부터 다시 시작할 수 있게 비운다. */
  clear(): void {
    localStorage.removeItem(LocalStorageImageLibrary.KEY);
  }

  /** 저장된 것이 없거나 깨졌으면 빈 보관소로 다룬다. */
  private read(): Record<string, { base64: string; mediaType: ImageAsset["mediaType"] }> {
    const saved = localStorage.getItem(LocalStorageImageLibrary.KEY);
    if (saved === null) return {};
    try {
      return JSON.parse(saved) as Record<string, { base64: string; mediaType: ImageAsset["mediaType"] }>;
    } catch {
      return {};
    }
  }

  /** 한 번에 넘기면 인자 수 한도에 걸리므로 나눠 담는다. */
  private static encode(bytes: Uint8Array): string {
    const CHUNK = 0x8000;
    let binary = "";
    for (let index = 0; index < bytes.length; index += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
    }
    return btoa(binary);
  }

  /** 저장할 때와 정확히 반대로 되돌린다. */
  private static decode(base64: string): Uint8Array {
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }
}

const templateLibrary = new LocalStorageTemplateLibrary();
const imageLibrary = new LocalStorageImageLibrary();
if (new URLSearchParams(location.search).get("fresh") === "1") {
  templateLibrary.clear();
  imageLibrary.clear();
}

new Designer({
  container,
  template: createTemplateFor(documentKind),
  sampleData: documentKind === "payslip" ? createSampleData() : createServiceReportData(),
  fontProvider: new PlaygroundFontProvider(),
  templateLibrary,
  imageLibrary,
  onChange: (template) => showSavedJson(template),
});

/** 주소로 고른 종류에 맞는 시작 템플릿을 준다. */
function createTemplateFor(kind: string): Template {
  if (kind === "report") return createServiceReportTemplate();
  if (kind === "saved") return TemplateFactory.fromJSON(savedServiceReport);
  if (kind === "blank") return createBlankTemplate();
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
