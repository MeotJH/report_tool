import {
  Binding,
  BoundTableSource,
  BoxElement,
  type Element,
  FieldElement,
  Frame,
  LineElement,
  PageSpec,
  TableColumn,
  TableElement,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";

const BLACK = "#111111";
const BLUE = "#2563eb";
const GRAY = "#d9d9d9";

/** 참고 이미지와 같은 인적사항·지급·공제·계산 영역을 가진 A4 템플릿을 만든다. */
export function createPayslipTemplate(): Template {
  const elements: Element[] = [];
  elements.push(...createFrameElements());
  elements.push(...createHeaderElements());
  elements.push(createPaymentTable());
  elements.push(createDeductionTable());
  elements.push(createCalculationTable());

  return new Template({
    id: "reference-payslip",
    name: "임금 명세서",
    version: 1,
    status: "published",
    page: new PageSpec("A4", "portrait", [6, 6, 6, 6]),
    fonts: ["Pretendard"],
    elements,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 급여명세서 픽스처의 필드와 반복 표에 결합할 대표 데이터를 제공한다. */
export function createPayslipData(): unknown {
  return {
    employee: {
      name: "홍길동",
      number: "073542",
      department: "개발지원팀",
      position: "팀장",
    },
    payments: [
      { name: "기본급", amount: "3,200,000" },
      { name: "연장근로수당", amount: "379,728" },
      { name: "야간근로수당", amount: "15,822" },
      { name: "휴일근로수당", amount: "94,932" },
      { name: "가족수당", amount: "150,000" },
      { name: "식대", amount: "100,000" },
    ],
    deductions: [
      { name: "소득세", amount: "115,530" },
      { name: "국민연금", amount: "177,570" },
      { name: "고용 보험", amount: "31,570" },
      { name: "건강 보험", amount: "135,350" },
      { name: "장기 요양 보험", amount: "15,590" },
      { name: "노동조합비", amount: "15,000" },
    ],
    calculations: [
      { name: "연장근로수당", formula: "연장근로시간 수 (16시간) x 15,822원 x 1.5", amount: "379,728" },
      { name: "야간근로수당", formula: "야간근로시간 수 (2시간) x 15,822원 x 0.5", amount: "15,822" },
      { name: "휴일근로수당", formula: "휴일근로시간 수 (4시간) x 15,822원 x 1.5", amount: "94,932" },
      { name: "가족수당", formula: "100,000원 x 1명(배우자) + 50,000원 x 1명", amount: "150,000" },
    ],
  };
}

/** 외곽선과 회색 구분 영역으로 참고 양식의 큰 구조를 잡는다. */
function createFrameElements(): Element[] {
  return [
    new BoxElement("outer", new Frame(6, 20, 198, 252), 0, false, {
      stroke: BLACK, strokeWidth: 0.5,
    }),
    new BoxElement("detail-header", new Frame(6, 54, 198, 9), 1, false, {
      fill: GRAY, stroke: BLACK, strokeWidth: 0.2,
    }),
    new BoxElement("calculation-header", new Frame(6, 183, 198, 9), 1, false, {
      fill: GRAY, stroke: BLACK, strokeWidth: 0.2,
    }),
    new LineElement("identity-middle", new Frame(6, 37, 198, 0), 2, false, BLACK, 0.2),
    new LineElement("identity-left", new Frame(34, 20, 0, 34), 2, false, BLACK, 0.2),
    new LineElement("identity-center", new Frame(105, 20, 0, 34), 2, false, BLACK, 0.2),
    new LineElement("identity-right", new Frame(133, 20, 0, 34), 2, false, BLACK, 0.2),
  ];
}

/** 제목과 인적사항 및 주요 구역명을 데이터 필드와 함께 배치한다. */
function createHeaderElements(): Element[] {
  const label = new TextStyle("Pretendard", 11, { weight: 700, align: "center" });
  const value = new TextStyle("Pretendard", 12, { weight: 700, align: "center", color: BLUE });
  return [
    text("title", "임금 명세서", new Frame(6, 7, 198, 10), 3, new TextStyle("Pretendard", 18, { weight: 700, align: "center" })),
    text("name-label", "성명", new Frame(6, 25, 28, 8), 3, label),
    field("name", "employee.name", new Frame(34, 25, 71, 8), 3, value),
    text("number-label", "사번", new Frame(105, 25, 28, 8), 3, label),
    field("number", "employee.number", new Frame(133, 25, 71, 8), 3, value),
    text("department-label", "부서", new Frame(6, 42, 28, 8), 3, label),
    field("department", "employee.department", new Frame(34, 42, 71, 8), 3, value),
    text("position-label", "직급", new Frame(105, 42, 28, 8), 3, label),
    field("position", "employee.position", new Frame(133, 42, 71, 8), 3, value),
    text("details", "세부 내역", new Frame(6, 55, 198, 7), 3, label),
    text("payments-title", "지 급", new Frame(6, 65, 99, 7), 3, label),
    text("deductions-title", "공 제", new Frame(105, 65, 99, 7), 3, label),
    text("payment-total", "지급액 계                 3,940,482", new Frame(8, 151, 95, 8), 3, value),
    text("deduction-total", "공제액 계                    490,610", new Frame(107, 151, 95, 8), 3, value),
    text("net-total", "실 수령액 (원)              3,472,161", new Frame(105, 161, 99, 9), 3, value),
    text("calculation-title", "계산 방법", new Frame(6, 184, 198, 7), 3, label),
  ];
}

/** 지급 내역을 왼쪽 반복 표로 표현한다. */
function createPaymentTable(): TableElement {
  return createMoneyTable("payments", 8, "payments");
}

/** 공제 내역을 오른쪽 반복 표로 표현한다. */
function createDeductionTable(): TableElement {
  return createMoneyTable("deductions", 107, "deductions");
}

/** 항목별 산출식을 하단 반복 표로 표현한다. */
function createCalculationTable(): TableElement {
  const header = new TextStyle("Pretendard", 9, { weight: 700, align: "center" });
  const cell = new TextStyle("Pretendard", 8, { align: "center", overflow: "shrink" });
  return new TableElement(
    "calculation-table", new Frame(8, 194, 194, 50), 3, false,
    new BoundTableSource(new Binding("calculations")),
    [
      new TableColumn("name", "구분", "{{row.name}}", 48, "center", null),
      new TableColumn("formula", "산출식 또는 산출방법", "{{row.formula}}", 104, "center", null),
      new TableColumn("amount", "지급액 (원)", "{{row.amount}}", 42, "right", null),
    ],
    9, header, cell, true, "clip",
  );
}

/** 지급·공제 표가 같은 열과 행 규칙을 공유하게 한다. */
function createMoneyTable(id: string, x: number, path: string): TableElement {
  const header = new TextStyle("Pretendard", 9, { weight: 700, align: "center" });
  const cell = new TextStyle("Pretendard", 9, { align: "center" });
  return new TableElement(
    id, new Frame(x, 75, 95, 68), 3, false, new BoundTableSource(new Binding(path)),
    [
      new TableColumn("name", id === "payments" ? "임금 항목" : "공제 항목", "{{row.name}}", 49, "center", null),
      new TableColumn("amount", id === "payments" ? "지급 금액(원)" : "공제 금액(원)", "{{row.amount}}", 46, "right", null),
    ],
    9, header, cell, true, "clip",
  );
}

/** 고정 문구 요소 생성의 반복을 줄이면서 모든 속성 이름을 호출부에 남긴다. */
function text(
  id: string,
  value: string,
  frame: Frame,
  z: number,
  style: TextStyle,
): TextElement {
  return new TextElement(id, frame, z, false, { kind: "literal", value }, style);
}

/** 데이터 필드 요소 생성의 반복을 줄이고 바인딩 경로를 명확히 드러낸다. */
function field(
  id: string,
  path: string,
  frame: Frame,
  z: number,
  style: TextStyle,
): FieldElement {
  return new FieldElement(id, frame, z, false, new Binding(path), style);
}
