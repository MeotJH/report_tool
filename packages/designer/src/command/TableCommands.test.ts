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
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { CommandStack } from "./CommandStack.js";
import {
  AddTableColumnCommand,
  AddTableRowCommand,
  BindTableColumnCommand,
  ChangeTableSourceCommand,
  RemoveTableColumnCommand,
  RemoveTableRowCommand,
  ResizeTableColumnCommand,
  ToggleTableHeaderCommand,
  UpdateTableCellCommand,
  UpdateTableHeaderCommand,
  UpdateTableRowHeightCommand,
} from "./TableCommands.js";

describe("Table commands", () => {
  it("정적 셀 변경을 실행·취소·재실행한다", () => {
    const stack = new CommandStack();
    const original = createTemplate(createStaticTable());
    const command = new UpdateTableCellCommand("table", 0, "item", "기본급");

    const changed = stack.execute(command, original);
    const undone = stack.undo(changed);
    const redone = stack.redo(undone ?? changed);

    expect(staticRows(changed)[0]?.item).toBe("기본급");
    expect(staticRows(undone ?? changed)[0]?.item).toBe("");
    expect(staticRows(redone ?? changed)[0]?.item).toBe("기본급");
  });

  it("정적 행 추가와 삭제를 각각 한 번의 undo 단위로 처리한다", () => {
    const stack = new CommandStack();
    const original = createTemplate(createStaticTable());
    const added = stack.execute(new AddTableRowCommand("table", 1), original);
    const removed = stack.execute(new RemoveTableRowCommand("table", 0), added);

    expect(staticRows(added)).toHaveLength(3);
    expect(staticRows(removed)).toHaveLength(2);
    expect(staticRows(stack.undo(removed) ?? removed)).toHaveLength(3);
  });

  it("열 추가·헤더 변경·너비 변경·삭제를 불변 표 교체로 처리한다", () => {
    const stack = new CommandStack();
    const original = createTemplate(createStaticTable());
    let current = original;
    const tax = new TableColumn("tax", "세금", "{{row.tax}}", 30, "right", null);

    current = stack.execute(new AddTableColumnCommand("table", tax, 1), current);
    expect(staticRows(current)[0]?.tax).toBe("");
    expect(currentTable(original).columns).toHaveLength(2);
    current = stack.execute(new UpdateTableHeaderCommand("table", 1, "공제액"), current);
    current = stack.execute(new ResizeTableColumnCommand("table", 1, 42), current);

    expect(currentTable(current).columns.map((column) => column.header))
      .toEqual(["항목", "공제액", "금액"]);
    expect(currentTable(current).columns[1]?.width).toBe(42);

    current = stack.execute(new RemoveTableColumnCommand("table", 1), current);
    expect(currentTable(current).columns.map((column) => column.key))
      .toEqual(["item", "amount"]);
    expect(staticRows(current)[0]).not.toHaveProperty("tax");
  });

  it("행 높이와 헤더 표시 변경을 undo 가능한 명령으로 기록한다", () => {
    const stack = new CommandStack();
    let current = createTemplate(createStaticTable());

    current = stack.execute(new UpdateTableRowHeightCommand("table", 11), current);
    current = stack.execute(new ToggleTableHeaderCommand("table", false), current);

    expect(currentTable(current).rowHeight).toBe(11);
    expect(currentTable(current).showHeader).toBe(false);
    expect(currentTable(stack.undo(current) ?? current).showHeader).toBe(true);
  });

  it("정적 표를 데이터 Source로 전환하고 undo하면 정적 행을 복원한다", () => {
    const stack = new CommandStack();
    const original = createTemplate(createStaticTable());
    const source = new BoundTableSource(new Binding("payments"));

    const changed = stack.execute(new ChangeTableSourceCommand("table", source), original);
    const restored = stack.undo(changed) ?? changed;

    expect(currentTable(changed).source).toBeInstanceOf(BoundTableSource);
    expect(currentTable(restored).source).toBeInstanceOf(StaticTableSource);
    expect(staticRows(restored)).toHaveLength(2);
  });

  it("데이터 Token 연결은 열 key·셀 템플릿과 제안 헤더를 함께 바꾼다", () => {
    const table = createStaticTable().withSource(
      new BoundTableSource(new Binding("payments")),
    );
    const original = createTemplate(table);
    const command = new BindTableColumnCommand(
      "table", 1, "paidAmount", "지급 금액", true,
    );

    const changed = command.execute(original);
    const column = currentTable(changed).columns[1];

    expect(column?.key).toBe("paidAmount");
    expect(column?.cellTemplate).toBe("{{row.paidAmount}}");
    expect(column?.header).toBe("지급 금액");
  });

  it("데이터 표 셀 편집과 잘못된 행·열 대상은 명확한 예외로 차단한다", () => {
    const bound = createStaticTable().withSource(
      new BoundTableSource(new Binding("payments")),
    );
    const boundTemplate = createTemplate(bound);
    const staticTemplate = createTemplate(createStaticTable());

    expect(() => new UpdateTableCellCommand("table", 0, "item", "값").execute(boundTemplate))
      .toThrow("정적 표의 셀만 직접 편집할 수 있다");
    expect(() => new RemoveTableRowCommand("table", 9).execute(staticTemplate))
      .toThrow("표 행 9를 찾을 수 없다");
    expect(() => new UpdateTableHeaderCommand("table", 9, "없음").execute(staticTemplate))
      .toThrow("표 열 9를 찾을 수 없다");
  });

  it("중복 열·마지막 열 삭제·0 이하 크기·잘못된 Token을 차단한다", () => {
    const staticTemplate = createTemplate(createStaticTable());
    const duplicate = new TableColumn("item", "중복", "", 20, "left", null);
    const oneColumnTable = createStaticTable().withColumns([
      new TableColumn("item", "항목", "{{row.item}}", 50, "left", null),
    ]);
    const boundTemplate = createTemplate(createStaticTable().withSource(
      new BoundTableSource(new Binding("payments")),
    ));

    expect(() => new AddTableColumnCommand("table", duplicate, 1).execute(staticTemplate))
      .toThrow("표 열 key item가 이미 존재한다");
    expect(() => new RemoveTableColumnCommand("table", 0).execute(createTemplate(oneColumnTable)))
      .toThrow("표에는 열이 하나 이상 필요하다");
    expect(() => new ResizeTableColumnCommand("table", 0, 0).execute(staticTemplate))
      .toThrow("표 열 너비는 0보다 커야 한다");
    expect(() => new UpdateTableRowHeightCommand("table", -1).execute(staticTemplate))
      .toThrow("표 행 높이는 0보다 커야 한다");
    expect(() => new BindTableColumnCommand("table", 0, "bad key", "", false).execute(boundTemplate))
      .toThrow("데이터 Token key 형식이 올바르지 않다");
  });

  it("실행되지 않았거나 실패한 명령은 취소 상태를 만들지 않는다", () => {
    const template = createTemplate(createStaticTable());
    const neverExecuted = new ToggleTableHeaderCommand("table", false);
    const failed = new RemoveTableRowCommand("table", 9);

    expect(() => neverExecuted.undo(template)).toThrow("실행하지 않은 표 명령은 취소할 수 없다");
    expect(() => failed.execute(template)).toThrow("표 행 9를 찾을 수 없다");
    expect(() => failed.undo(template)).toThrow("실행하지 않은 표 명령은 취소할 수 없다");
  });

  it("모든 표 명령을 역순 Undo하고 같은 순서로 Redo하면 처음과 최종 상태가 복원된다", () => {
    const stack = new CommandStack();
    const original = createTemplate(createStaticTable());
    const tax = new TableColumn("tax", "세금", "{{row.tax}}", 20, "right", null);
    const commands = [
      new UpdateTableCellCommand("table", 0, "item", "기본급"),
      new AddTableRowCommand("table", 2),
      new RemoveTableRowCommand("table", 2),
      new AddTableColumnCommand("table", tax, 1),
      new UpdateTableHeaderCommand("table", 1, "공제"),
      new ResizeTableColumnCommand("table", 1, 25),
      new UpdateTableRowHeightCommand("table", 10),
      new ToggleTableHeaderCommand("table", false),
      new RemoveTableColumnCommand("table", 1),
      new ChangeTableSourceCommand("table", new BoundTableSource(new Binding("payments"))),
      new BindTableColumnCommand("table", 1, "paidAmount", "지급 금액", true),
    ];
    let changed = original;
    for (const command of commands) changed = stack.execute(command, changed);
    const expectedFinalTable = currentTable(changed).toJSON();

    let undone = changed;
    for (const _command of commands) undone = requireHistory(stack.undo(undone));
    expect(currentTable(undone).toJSON()).toEqual(currentTable(original).toJSON());

    let redone = undone;
    for (const _command of commands) redone = requireHistory(stack.redo(redone));
    expect(currentTable(redone).toJSON()).toEqual(expectedFinalTable);
  });

  it("표가 아닌 요소를 대상으로 하면 기존 템플릿을 변경하지 않는다", () => {
    const style = new TextStyle("Pretendard", 10);
    const text = new TextElement(
      "text", new Frame(0, 0, 20, 5), 0, false,
      { kind: "literal", value: "문구" }, style,
    );
    const template = createTemplate(text);

    expect(() => new ToggleTableHeaderCommand("text", false).execute(template))
      .toThrow("TableElement가 아닌 요소는 표 명령으로 변경할 수 없다");
  });
});

/** 표 명령 테스트가 사용할 두 열·두 행 정적 표를 만든다. */
function createStaticTable(): TableElement {
  const style = new TextStyle("Pretendard", 9);
  return new TableElement(
    "table", new Frame(10, 20, 100, 30), 0, false,
    new StaticTableSource([{ item: "", amount: "" }, { item: "", amount: "" }]),
    [
      new TableColumn("item", "항목", "{{row.item}}", 50, "left", null),
      new TableColumn("amount", "금액", "{{row.amount}}", 50, "right", null),
    ],
    8, style, style, true, "clip",
  );
}

/** 하나의 대상 요소만 가진 편집 가능한 명령 테스트 템플릿을 만든다. */
function createTemplate(element: TableElement | TextElement): Template {
  return new Template({
    id: "template", name: "표 테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [0, 0, 0, 0]),
    fonts: ["Pretendard"], elements: [element],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 명령 결과에서 대상 표를 타입 안전하게 꺼낸다. */
function currentTable(template: Template): TableElement {
  const element = template.getElements()[0];
  if (!(element instanceof TableElement)) throw new Error("테스트 표를 찾을 수 없다");
  return element;
}

/** 정적 Source의 행을 명령 결과 비교에 사용할 수 있게 반환한다. */
function staticRows(template: Template): StaticTableSource["rows"] {
  const source = currentTable(template).source;
  if (!(source instanceof StaticTableSource)) throw new Error("정적 표가 아니다");
  return source.rows;
}

/** 테스트가 기대한 Undo·Redo 결과가 누락되면 즉시 원인을 드러낸다. */
function requireHistory(template: Template | null): Template {
  if (template === null) throw new Error("기대했던 명령 이력이 없다");
  return template;
}
