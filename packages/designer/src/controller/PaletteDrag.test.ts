import {
  Binding,
  BoundTableSource,
  BoxElement,
  FieldElement,
  Frame,
  PageSpec,
  StaticTableSource,
  TableColumn,
  TableElement,
  Template,
  TemplateVariable,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { EditorController } from "./EditorController.js";
import { PaletteDrag } from "./PaletteDrag.js";
import { PaletteEntryBuilder, type PaletteEntry } from "./PaletteEntry.js";

const style = new TextStyle("Pretendard", 9);

/** 급여 항목 배열과 단일 필드를 선언한 템플릿 변수를 만든다. */
const variables: readonly TemplateVariable[] = [
  new TemplateVariable("payItems", "지급 항목", "array"),
  new TemplateVariable("payItems.item", "항목", "string"),
  new TemplateVariable("payItems.amount", "금액", "currency"),
  new TemplateVariable("deductionItems", "공제 항목", "array"),
  new TemplateVariable("deductionItems.item", "항목", "string"),
  new TemplateVariable("deductionItems.amount", "금액", "currency"),
  new TemplateVariable("netPay", "실지급액", "currency"),
  new TemplateVariable(
    "employee.residentNumber", "주민등록번호", "string", true, { sensitive: true },
  ),
];

const entries = new PaletteEntryBuilder().build(variables);

/** 팔레트 목록에서 경로로 항목을 찾는다. */
function find(path: string): PaletteEntry {
  const search = (list: readonly PaletteEntry[]): PaletteEntry | undefined => {
    for (const entry of list) {
      if (entry.path === path) return entry;
      const found = search(entry.children);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  const found = search(entries);
  if (found === undefined) throw new Error(`팔레트 항목 ${path}를 찾지 못했다`);
  return found;
}

/** 팔레트에서 배열 줄을 집어 든 상태를 만든다. */
function arrayItem(path: "payItems" | "deductionItems"): PaletteEntry {
  return find(path);
}

/** 팔레트에서 배열 자식 줄을 집어 든 상태를 만든다. */
function childItem(arrayPath: string, key: string): PaletteEntry {
  return find(`${arrayPath}.${key}`);
}

/** 요소가 배치된 편집 세션을 만든다. */
function createController(...elements: readonly Element[]): EditorController {
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
  return new EditorController(template);
}

/** 검증 대상이 되는 표를 원하는 Source로 만든다. */
function table(id: string, source: StaticTableSource | BoundTableSource): TableElement {
  return new TableElement(
    id, new Frame(20, 60, 100, 30), 0, false, source,
    [
      new TableColumn("item", "항목", "{{row.item}}", 60, "left", null),
      new TableColumn("amount", "금액", "{{row.amount}}", 40, "right", null),
    ],
    7, style, style, true, "clip",
  );
}

/** 템플릿에서 유일한 표를 찾아 검증을 짧게 유지한다. */
function onlyTable(controller: EditorController): TableElement {
  const found = controller.getTemplate().getElements()
    .find((element): element is TableElement => element instanceof TableElement);
  if (found === undefined) throw new Error("표를 찾지 못했다");
  return found;
}

describe("배열 필드를 놓아 데이터 표 만들기", () => {
  it("빈 곳에 놓으면 배열 경로에 연결된 표가 생긴다", () => {
    const controller = createController();

    PaletteDrag.create(arrayItem("payItems")).dropAt(20, 60, controller);

    const created = onlyTable(controller);
    expect(created.source).toBeInstanceOf(BoundTableSource);
    expect((created.source as BoundTableSource).binding.path.toString()).toBe("payItems");
    expect(created.frame.x).toBe(20);
    expect(created.frame.y).toBe(60);
  });

  it("자식 스키마의 label이 헤더 기본값이 된다", () => {
    const controller = createController();

    PaletteDrag.create(arrayItem("payItems")).dropAt(20, 60, controller);

    expect(onlyTable(controller).columns.map((column) => column.header))
      .toEqual(["항목", "금액"]);
  });

  it("열 표현식은 배열 경로가 아니라 행 안의 키를 참조한다", () => {
    const controller = createController();

    PaletteDrag.create(arrayItem("payItems")).dropAt(20, 60, controller);

    expect(onlyTable(controller).columns.map((column) => column.cellTemplate))
      .toEqual(["{{row.item}}", "{{row.amount}}"]);
  });

  it("금액 열은 오른쪽 정렬과 통화 포맷을 기본으로 갖는다", () => {
    const controller = createController();

    PaletteDrag.create(arrayItem("payItems")).dropAt(20, 60, controller);

    const amount = onlyTable(controller).columns[1]!;
    expect(amount.align).toBe("right");
    expect(amount.formatSpec).toEqual({ kind: "currency", currency: "KRW" });
  });

  it("새 표는 즉시 선택되고 실행 취소로 사라진다", () => {
    const controller = createController();

    PaletteDrag.create(arrayItem("payItems")).dropAt(20, 60, controller);
    expect(controller.getSelectionModel().count()).toBe(1);

    controller.undo();
    expect(controller.getTemplate().getElements()).toHaveLength(0);
  });

  it("행 수는 데이터가 정하므로 사람마다 달라도 된다", () => {
    const controller = createController();

    PaletteDrag.create(arrayItem("payItems")).dropAt(20, 60, controller);

    const source = onlyTable(controller).source;
    expect(source.resolveRows({ payItems: [{ item: "기본급" }] })).toHaveLength(1);
    expect(source.resolveRows({ payItems: [{}, {}, {}, {}] })).toHaveLength(4);
  });

  it("클릭만 하면 배치 영역 왼쪽 위에 표를 만든다", () => {
    const controller = createController();

    PaletteDrag.create(arrayItem("payItems")).place(controller);

    expect(onlyTable(controller).frame.x).toBe(10);
    expect(onlyTable(controller).frame.y).toBe(10);
  });
});

describe("기존 표에 배열을 놓아 데이터 표로 바꾸기", () => {
  it("정적 표가 데이터 표로 바뀌고 열이 새 스키마로 교체된다", () => {
    const controller = createController(table("t", new StaticTableSource([])));

    PaletteDrag.create(arrayItem("deductionItems")).dropAt(30, 65, controller);

    const changed = onlyTable(controller);
    expect(changed.id).toBe("t");
    expect((changed.source as BoundTableSource).binding.path.toString())
      .toBe("deductionItems");
    expect(changed.columns.map((column) => column.header)).toEqual(["항목", "금액"]);
  });

  it("전환은 기존 열 너비 합계를 유지한다", () => {
    const controller = createController(table("t", new StaticTableSource([])));

    PaletteDrag.create(arrayItem("deductionItems")).dropAt(30, 65, controller);

    const total = onlyTable(controller).columns
      .reduce((sum, column) => sum + column.width, 0);
    expect(total).toBe(100);
  });

  it("입력했던 행이 사라지면 되돌릴 수 있다고 알린다", () => {
    const controller = createController(table("t", new StaticTableSource([
      { item: "국민연금", amount: 189000 },
      { item: "건강보험", amount: 148900 },
    ])));

    PaletteDrag.create(arrayItem("deductionItems")).dropAt(30, 65, controller);

    expect(controller.getNotice()).toContain("2행");
  });

  it("잃을 입력이 없으면 알리지 않는다", () => {
    const controller = createController(table("t", new StaticTableSource([])));

    PaletteDrag.create(arrayItem("deductionItems")).dropAt(30, 65, controller);

    expect(controller.getNotice()).toBeNull();
  });

  it("전환은 실행 취소 한 번으로 입력했던 행까지 복원한다", () => {
    const controller = createController(table("t", new StaticTableSource([
      { item: "국민연금", amount: 189000 },
    ])));

    PaletteDrag.create(arrayItem("deductionItems")).dropAt(30, 65, controller);
    controller.undo();

    const restored = onlyTable(controller);
    expect(restored.source).toBeInstanceOf(StaticTableSource);
    expect(restored.source.resolveRows({})).toEqual([{ item: "국민연금", amount: 189000 }]);
  });

  it("표가 아닌 요소 위에 놓으면 그 자리에 새 표를 만든다", () => {
    const controller = createController(
      new BoxElement("box", new Frame(20, 60, 100, 30), 0, false),
    );

    PaletteDrag.create(arrayItem("payItems")).dropAt(30, 65, controller);

    expect(controller.getTemplate().getElements()).toHaveLength(2);
    expect(onlyTable(controller).frame.x).toBe(30);
  });
});

describe("배열 자식 필드를 놓기", () => {
  it("같은 배열의 데이터 표 열에 놓으면 그 열만 다시 연결한다", () => {
    const controller = createController(
      table("t", new BoundTableSource(new Binding("payItems"))),
    );

    PaletteDrag.create(childItem("payItems", "amount")).dropAt(30, 65, controller);

    const columns = onlyTable(controller).columns;
    expect(columns[0]?.cellTemplate).toBe("{{row.amount}}");
    expect(columns[0]?.header).toBe("금액");
    expect(columns[1]?.cellTemplate).toBe("{{row.amount}}");
    expect(controller.getTemplate().getElements()).toHaveLength(1);
  });

  it("놓은 가로 위치의 열만 바뀐다", () => {
    const controller = createController(
      table("t", new BoundTableSource(new Binding("payItems"))),
    );

    PaletteDrag.create(childItem("payItems", "item")).dropAt(100, 65, controller);

    const columns = onlyTable(controller).columns;
    expect(columns[0]?.header).toBe("항목");
    expect(columns[1]?.header).toBe("항목");
    expect(columns[1]?.cellTemplate).toBe("{{row.item}}");
  });

  it("다른 배열의 표 위에 놓으면 열을 건드리지 않고 필드를 만든다", () => {
    const controller = createController(
      table("t", new BoundTableSource(new Binding("deductionItems"))),
    );

    PaletteDrag.create(childItem("payItems", "amount")).dropAt(30, 65, controller);

    expect(onlyTable(controller).columns[0]?.cellTemplate).toBe("{{row.item}}");
    expect(controller.getTemplate().getElements()
      .some((element) => element instanceof FieldElement)).toBe(true);
  });

  it("정적 표 위에 놓으면 열을 연결하지 않고 필드를 만든다", () => {
    const controller = createController(table("t", new StaticTableSource([])));

    PaletteDrag.create(childItem("payItems", "amount")).dropAt(30, 65, controller);

    expect(onlyTable(controller).source).toBeInstanceOf(StaticTableSource);
    expect(controller.getTemplate().getElements()).toHaveLength(2);
  });
});

describe("단일 필드를 놓기", () => {
  it("빈 곳에 놓으면 그 자리에 데이터 필드를 만든다", () => {
    const controller = createController();
    const item = find("netPay");

    PaletteDrag.create(item).dropAt(40, 80, controller);

    const created = controller.getTemplate().getElements()[0] as FieldElement;
    expect(created).toBeInstanceOf(FieldElement);
    expect(created.binding.path.toString()).toBe("netPay");
  });

  it("민감한 값은 놓는 순간부터 가려진다", () => {
    // 놓고 나서 담당자가 따로 설정해야 한다면, 잊은 한 번이 주민등록번호가
    // 평문으로 찍힌 발행본이 된다. 되돌릴 수 없는 사고다.
    const controller = createController();

    PaletteDrag.create(find("employee.residentNumber")).dropAt(40, 80, controller);

    const created = controller.getTemplate().getElements()[0] as FieldElement;
    expect(created.binding.formatSpec).toEqual({ kind: "mask", keepHead: 6, keepTail: 1 });
  });

  it("민감하지 않은 값에는 마스킹을 걸지 않는다", () => {
    const controller = createController();

    PaletteDrag.create(find("netPay")).dropAt(40, 80, controller);

    const created = controller.getTemplate().getElements()[0] as FieldElement;
    expect(created.binding.formatSpec).toBeNull();
  });

  it("클릭으로 놓아도 마스킹이 걸린다", () => {
    // 끌어 놓기와 클릭이 다르게 동작하면, 어느 쪽으로 놓았는지가 안전을 가른다.
    const controller = createController();

    PaletteDrag.create(find("employee.residentNumber")).place(controller);

    const created = controller.getTemplate().getElements()[0] as FieldElement;
    expect(created.binding.formatSpec).toEqual({ kind: "mask", keepHead: 6, keepTail: 1 });
  });
});
