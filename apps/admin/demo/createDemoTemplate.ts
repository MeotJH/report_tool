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
  TemplateVariable,
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
    variables: declaredVariables(),
    elements: [...headerElements(), paymentTable(), deductionTable()],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}

/**
 * 이 양식이 발행 때 요구하는 데이터를 스스로 선언한다.
 *
 * 선언이 없어도 발행은 된다. 그런데 그러면 **호스트 백엔드가 무슨 JSON을 만들어야
 * 하는지 알 방법이 없다** — 양식 JSON을 직접 뜯어 경로를 찾는 수밖에 없고, 양식에
 * 칸이 하나 늘어도 아무도 알려 주지 않는다. 그 칸은 빈칸으로 발행되고 오류도
 * 나지 않는다.
 *
 * 데모 양식이 선언을 빠뜨리면 데이터 명세 화면이 "선언되지 않음"만 늘어놓게 되어,
 * 그 화면이 무엇을 위한 것인지 보여 주지 못한다.
 */
function declaredVariables(): readonly TemplateVariable[] {
  return [
    new TemplateVariable("employee.name", "성명", "string", true),
    new TemplateVariable("employee.number", "사원번호", "string", true),
    new TemplateVariable("employee.department", "부서", "string", true),
    new TemplateVariable("employee.position", "직위", "string"),
    new TemplateVariable("payments", "지급 항목", "array", true),
    new TemplateVariable("payments.name", "항목", "string"),
    new TemplateVariable("payments.amount", "금액", "currency"),
    new TemplateVariable("deductions", "공제 항목", "array", true),
    new TemplateVariable("deductions.name", "항목", "string"),
    new TemplateVariable("deductions.amount", "금액", "currency"),
  ];
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
