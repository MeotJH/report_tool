import {
  Binding,
  BoundTableSource,
  Frame,
  PageSpec,
  StaticTableSource,
  TableColumn,
  TableElement,
  Template,
  TextElement,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { CanvasEditSession } from "./CanvasEditSession.js";
import { EditorActions } from "./EditorActions.js";
import { EditorController } from "./EditorController.js";

const headerStyle = new TextStyle("Pretendard", 9, { weight: 700 });
const cellStyle = new TextStyle("Pretendard", 8);

/** 편집 세션 검증에 쓸 편집 세션과 행동을 함께 준비한다. */
function createEditor(...elements: readonly Element[]) {
  const template = elements.reduce(
    (current, element) => current.addElement(element),
    new Template({
      id: "t", name: "테스트", version: 1, status: "draft",
      page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
      fonts: ["Pretendard"], elements: [],
      createdAt: "2026-08-23T00:00:00.000Z",
      updatedAt: "2026-08-23T00:00:00.000Z",
    }),
  );
  const controller = new EditorController(template);
  return { controller, actions: new EditorActions(controller) };
}

/** 정적 행을 가진 공제 표를 만든다. */
function staticTable(): TableElement {
  return new TableElement(
    "deductions", new Frame(20, 50, 100, 40), 0, false,
    new StaticTableSource([
      { item: "국민연금", amount: 189000 },
      { item: "", amount: "" },
    ]),
    [
      new TableColumn("item", "항목", "{{row.item}}", 60, "left", null),
      new TableColumn("amount", "금액", "{{row.amount}}", 40, "right", null),
    ],
    10, headerStyle, cellStyle, true, "clip",
  );
}

/** 템플릿에서 공제 표를 다시 찾아 검증을 짧게 유지한다. */
function tableOf(controller: EditorController): TableElement {
  return controller.getElement("deductions") as TableElement;
}

describe("정적 표 셀 편집", () => {
  it("저장된 셀 값을 입력기에 그대로 보여준다", () => {
    const { controller } = createEditor(staticTable());

    const session = CanvasEditSession.create(
      { kind: "tableCell", elementId: "deductions", rowIndex: 0, columnIndex: 0 },
      controller,
    );

    expect(session?.value()).toBe("국민연금");
    expect(session?.style()).toBe(cellStyle);
  });

  it("입력한 값이 템플릿의 정적 행에 저장된다", () => {
    const { controller, actions } = createEditor(staticTable());
    const session = CanvasEditSession.create(
      { kind: "tableCell", elementId: "deductions", rowIndex: 1, columnIndex: 0 },
      controller,
    )!;

    session.commit("건강보험", actions);

    expect(tableOf(controller).source.resolveRows({})[1])
      .toEqual({ item: "건강보험", amount: "" });
  });

  it("금액 칸에 넣은 숫자는 숫자로 저장된다", () => {
    const { controller, actions } = createEditor(staticTable());
    const session = CanvasEditSession.create(
      { kind: "tableCell", elementId: "deductions", rowIndex: 1, columnIndex: 1 },
      controller,
    )!;

    session.commit("148900", actions);

    const row = tableOf(controller).source.resolveRows({})[1] as Record<string, unknown>;
    expect(row.amount).toBe(148900);
  });

  it("셀 입력은 한 번의 실행 취소로 되돌아간다", () => {
    const { controller, actions } = createEditor(staticTable());
    const session = CanvasEditSession.create(
      { kind: "tableCell", elementId: "deductions", rowIndex: 0, columnIndex: 0 },
      controller,
    )!;

    session.commit("국민연금(변경)", actions);
    controller.undo();

    expect(tableOf(controller).source.resolveRows({})[0])
      .toEqual({ item: "국민연금", amount: 189000 });
  });

  it("입력기는 그 셀 한 칸만 덮는다", () => {
    const { controller } = createEditor(staticTable());

    const session = CanvasEditSession.create(
      { kind: "tableCell", elementId: "deductions", rowIndex: 1, columnIndex: 1 },
      controller,
    )!;

    expect(session.frame()).toEqual(new Frame(80, 70, 40, 10));
  });

  it("데이터 표의 본문 셀은 편집 세션을 만들지 않는다", () => {
    const bound = staticTable().withSource(new BoundTableSource(new Binding("items")));
    const { controller } = createEditor(bound);

    expect(CanvasEditSession.create(
      { kind: "tableCell", elementId: "deductions", rowIndex: 0, columnIndex: 0 },
      controller,
    )).toBeNull();
  });

  it("데이터 표의 본문 셀을 눌렀을 때 왜 안 되는지 알려 준다", () => {
    // 아무 일도 일어나지 않으면 사용자는 자기가 잘못 눌렀다고 생각한다.
    const bound = staticTable().withSource(new BoundTableSource(new Binding("items")));
    const { controller } = createEditor(bound);

    const refusal = CanvasEditSession.refusalFor(
      { kind: "tableCell", elementId: "deductions", rowIndex: 0, columnIndex: 0 },
      controller,
    );

    expect(refusal).toContain("데이터에서 옵니다");
    expect(refusal).toContain("행 출처");
  });

  it("고칠 수 있는 자리는 아무 말도 하지 않는다", () => {
    const { controller } = createEditor(staticTable());

    expect(CanvasEditSession.refusalFor(
      { kind: "tableCell", elementId: "deductions", rowIndex: 0, columnIndex: 0 },
      controller,
    )).toBeNull();
  });

  it("데이터 표라도 머리글은 고칠 수 있으므로 아무 말도 하지 않는다", () => {
    const bound = staticTable().withSource(new BoundTableSource(new Binding("items")));
    const { controller } = createEditor(bound);

    expect(CanvasEditSession.refusalFor(
      { kind: "tableHeader", elementId: "deductions", columnIndex: 0 },
      controller,
    )).toBeNull();
  });
});

describe("표 헤더 편집", () => {
  it("사용자가 정한 헤더가 저장되고 열의 데이터 연결은 그대로 남는다", () => {
    const { controller, actions } = createEditor(staticTable());
    const session = CanvasEditSession.create(
      { kind: "tableHeader", elementId: "deductions", columnIndex: 0 },
      controller,
    )!;

    session.commit("공제 항목", actions);

    const columns = tableOf(controller).columns;
    expect(columns[0]?.header).toBe("공제 항목");
    expect(columns[0]?.cellTemplate).toBe("{{row.item}}");
  });

  it("데이터 표의 헤더도 편집할 수 있다", () => {
    const bound = staticTable().withSource(new BoundTableSource(new Binding("items")));
    const { controller, actions } = createEditor(bound);
    const session = CanvasEditSession.create(
      { kind: "tableHeader", elementId: "deductions", columnIndex: 1 },
      controller,
    )!;

    session.commit("공제액", actions);

    expect(tableOf(controller).columns[1]?.header).toBe("공제액");
  });

  it("헤더는 헤더 행 스타일을 사용한다", () => {
    const { controller } = createEditor(staticTable());

    const session = CanvasEditSession.create(
      { kind: "tableHeader", elementId: "deductions", columnIndex: 0 },
      controller,
    );

    expect(session?.style()).toBe(headerStyle);
  });
});

describe("문구 요소 편집", () => {
  const text = new TextElement(
    "title", new Frame(20, 18, 170, 12), 1, false,
    { kind: "template", value: "{{employee.name}} 님" }, headerStyle,
  );

  it("문구 종류를 유지한 채 내용만 바꾼다", () => {
    const { controller, actions } = createEditor(text);
    const session = CanvasEditSession.create(
      { kind: "text", elementId: "title" }, controller,
    )!;

    session.commit("{{employee.name}} 귀하", actions);

    const changed = controller.getElement("title") as TextElement;
    expect(changed.content).toEqual({
      kind: "template", value: "{{employee.name}} 귀하",
    });
  });

  it("단일 문구에는 Tab으로 옮겨 갈 칸이 없다", () => {
    const { controller } = createEditor(text);

    const session = CanvasEditSession.create(
      { kind: "text", elementId: "title" }, controller,
    )!;

    expect(session.next(1)).toBeUndefined();
  });
});
