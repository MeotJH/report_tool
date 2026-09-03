import {
  Binding,
  BoundTableSource,
  type Element,
  FieldElement,
  Frame,
  PageSpec,
  TableColumn,
  TableElement,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";

/**
 * 데모가 발행할 급여명세서 한 장을 코드로 만든다.
 *
 * 실제 서비스라면 이 자리에 **편집기가 저장한 JSON**이 온다
 * (`TemplateFactory.fromJSON`). 여기서 코드로 짓는 이유는 데모를 켜자마자 발행할
 * 수 있어야 하기 때문이고, 겸해서 "호스트가 코드로도 양식을 만들 수 있다"를
 * 보여 준다.
 *
 * 데이터 키는 `StaticJsonDataProvider`가 주는 모양과 1:1로 맞춘다. 어긋나면
 * 발행본에 빈칸이 나오는데, 그것은 양식 문제가 아니라 데이터 문제라 찾기 어렵다.
 */
export function createDemoTemplate(): Template {
  return new Template({
    id: "demo-payslip",
    name: "데모 급여명세서",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [15, 15, 15, 15]),
    fonts: ["Pretendard"],
    elements: [...headerElements(), paymentTable(), deductionTable()],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}

/** 제목과 인적사항 네 줄이다. */
function headerElements(): readonly Element[] {
  const label = new TextStyle("Pretendard", 10);
  const value = new TextStyle("Pretendard", 10, { weight: 700 });
  return [
    new TextElement(
      "title", new Frame(15, 15, 180, 12), 0, false,
      { kind: "literal", value: "급여명세서" },
      new TextStyle("Pretendard", 20, { weight: 700, align: "center" }),
    ),
    ...fieldRow("name", 32, "성명", "employee.name", label, value),
    ...fieldRow("number", 40, "사원번호", "employee.number", label, value),
    ...fieldRow("department", 48, "부서", "employee.department", label, value),
    ...fieldRow("position", 56, "직위", "employee.position", label, value),
  ];
}

/** `이름: 값` 한 줄을 만든다. 라벨은 고정 문구, 값만 데이터에서 온다. */
function fieldRow(
  key: string,
  y: number,
  label: string,
  path: string,
  labelStyle: TextStyle,
  valueStyle: TextStyle,
): readonly Element[] {
  return [
    new TextElement(
      `${key}-label`, new Frame(15, y, 30, 7), 1, false,
      { kind: "literal", value: label }, labelStyle,
    ),
    new FieldElement(
      `${key}-value`, new Frame(48, y, 60, 7), 1, false,
      new Binding(path), valueStyle,
    ),
  ];
}

/** 지급 항목 표다. 행 수는 발행 데이터가 정한다. */
function paymentTable(): TableElement {
  return amountTable("payments", "지급 항목", 70);
}

/** 공제 항목 표다. */
function deductionTable(): TableElement {
  return amountTable("deductions", "공제 항목", 140);
}

/**
 * `항목 | 금액` 두 열짜리 표를 만든다.
 *
 * 금액 열을 오른쪽 정렬로 두는 이유는, 자릿수가 다른 숫자가 왼쪽에 붙으면 눈으로
 * 합을 가늠할 수 없기 때문이다.
 */
function amountTable(path: string, header: string, y: number): TableElement {
  return new TableElement(
    `${path}-table`,
    new Frame(15, y, 180, 60),
    2,
    false,
    new BoundTableSource(new Binding(path)),
    [
      new TableColumn("name", header, "{{row.name}}", 120, "left", null),
      new TableColumn("amount", "금액(원)", "{{row.amount}}", 60, "right", null),
    ],
    8,
    new TextStyle("Pretendard", 10, { weight: 700 }),
    new TextStyle("Pretendard", 10),
    true,
    "clip",
  );
}
