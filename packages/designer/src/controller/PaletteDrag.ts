import {
  Binding,
  BoundTableSource,
  FieldElement,
  Frame,
  TableElement,
  TextStyle,
} from "@report-tool/core";
import { AddElementCommand } from "../command/AddElementCommand.js";
import { BindTableColumnCommand } from "../command/TableCommands.js";
import { ChangeElementCommand } from "../command/ChangeElementCommand.js";
import type { EditorController } from "./EditorController.js";
import { FieldPlacementPlanner } from "./FieldPlacementPlanner.js";
import type { PaletteEntry } from "./PaletteEntry.js";
import { TableColumnPlanner } from "./TableColumnPlanner.js";
import { TableEditor } from "./TableEditor.js";

/**
 * 팔레트에서 끌어온 항목이 놓인 자리에 따라 무엇을 만들지 스스로 결정한다.
 *
 * "단일 필드인가 배열인가"와 "빈 곳인가 표 위인가"를 조건문으로 조합하면 네 갈래가
 * 한 메서드에 뒤섞인다. 끌어온 것이 무엇인지를 타입으로 나눠 각자 판단하게 한다.
 */
export abstract class PaletteDrag {
  /** 항목 종류를 보고 대응하는 배치 전략을 고른다. */
  static create(entry: PaletteEntry): PaletteDrag {
    if (entry.type === "array" && entry.children.length > 0) {
      return new ArrayDrag(entry.path, entry.children);
    }
    return new FieldDrag(entry);
  }

  /** 사용자가 문서의 특정 위치에 놓았을 때의 배치를 결정한다. */
  abstract dropAt(xMm: number, yMm: number, controller: EditorController): void;

  /** 클릭만 했을 때 빈 자리를 찾아 배치한다. */
  abstract place(controller: EditorController): void;

  /** 새 요소가 충돌하지 않는 브라우저 표준 식별자를 갖게 한다. */
  protected createId(): string {
    return globalThis.crypto.randomUUID();
  }

  /** 새 요소가 기존 요소 위에 보여 결과를 바로 확인할 수 있게 한다. */
  protected nextZIndex(controller: EditorController): number {
    const zIndexes = controller.getTemplate().getElements().map((element) => element.z);
    return zIndexes.length === 0 ? 0 : Math.max(...zIndexes) + 1;
  }
}

/**
 * 단일 데이터 필드를 배치하거나 데이터 표의 열에 연결한다.
 *
 * 같은 배열에 속한 필드를 그 배열로 만든 표 위에 놓으면 새 필드를 만드는 것보다
 * 그 열을 다시 연결하는 것이 사용자의 의도일 가능성이 높다.
 */
class FieldDrag extends PaletteDrag {
  private readonly placementPlanner = new FieldPlacementPlanner();
  private readonly tableEditor = new TableEditor();

  /** 끌어온 필드의 경로와 소속 배열을 드래그 수명 동안 보존한다. */
  constructor(private readonly entry: PaletteEntry) {
    super();
  }

  /** 표 위에 놓았으면 열 연결로, 아니면 그 자리에 필드 추가로 해석한다. */
  dropAt(xMm: number, yMm: number, controller: EditorController): void {
    const target = controller.findElementAt(xMm, yMm);
    if (target instanceof TableElement && this.belongsToTableArray(target)) {
      this.bindColumn(target, xMm, controller);
      return;
    }
    this.addField(
      this.placementPlanner.at(controller.getTemplate(), xMm, yMm),
      controller,
    );
  }

  /** 클릭만 했으면 비어 있는 다음 자리에 필드를 추가한다. */
  place(controller: EditorController): void {
    this.addField(this.placementPlanner.next(controller.getTemplate()), controller);
  }

  /** 끌어온 필드가 이 표가 반복하는 배열의 자식인지 확인한다. */
  private belongsToTableArray(table: TableElement): boolean {
    if (this.entry.arrayPath === null) return false;
    if (!(table.source instanceof BoundTableSource)) return false;
    return table.source.binding.path.toString() === this.entry.arrayPath;
  }

  /** 놓은 가로 위치의 열만 이 필드에 다시 연결한다. */
  private bindColumn(
    table: TableElement,
    xMm: number,
    controller: EditorController,
  ): void {
    const index = this.tableEditor.columnIndexAtOffset(table, xMm - table.frame.x);
    if (index === undefined) return;
    controller.execute(new BindTableColumnCommand(
      table.id, index, this.childKey(), this.entry.label, true,
    ));
    controller.selectElement(table.id);
  }

  /** 열 표현식은 배열 경로가 아니라 행 안의 키를 참조해야 한다. */
  private childKey(): string {
    const separator = this.entry.path.lastIndexOf(".");
    return separator === -1 ? this.entry.path : this.entry.path.slice(separator + 1);
  }

  /** 클릭과 드롭이 동일한 필드 기본값과 실행 취소 이력을 사용하게 한다. */
  private addField(frame: Frame, controller: EditorController): void {
    const element = new FieldElement(
      this.createId(),
      frame,
      this.nextZIndex(controller),
      false,
      new Binding(this.entry.path),
      new TextStyle("Pretendard", 10),
    );
    controller.execute(new AddElementCommand(element));
    controller.selectElement(element.id);
    controller.activateSelectTool();
  }
}

/**
 * 배열 필드를 반복 행을 가진 데이터 표로 만든다.
 *
 * 사용자가 배열을 놓는 행동의 의미는 "이 배열의 항목마다 한 줄씩 나오게 하라"이므로
 * 빈 표가 아니라 자식 스키마로 열까지 구성된 표가 즉시 만들어져야 한다.
 */
class ArrayDrag extends PaletteDrag {
  private readonly columnPlanner = new TableColumnPlanner();

  /** 새 표가 페이지 폭을 넘지 않으면서 읽을 만한 기본 크기를 갖게 한다. */
  private static readonly DEFAULT_ROW_HEIGHT_MM = 7;
  private static readonly DEFAULT_BODY_ROWS = 3;

  /** 기존 내용과 붙어 보이지 않게 둘 최소 간격이다. */
  private static readonly GAP_MM = 4;
  private readonly tableEditor = new TableEditor();

  /** 배열 경로와 자식 스키마를 드래그 수명 동안 보존한다. */
  constructor(
    private readonly arrayPath: string,
    private readonly children: readonly PaletteEntry[],
  ) {
    super();
  }

  /** 표 위에 놓았으면 그 표를 데이터 표로 바꾸고, 아니면 새 표를 만든다. */
  dropAt(xMm: number, yMm: number, controller: EditorController): void {
    const target = controller.findElementAt(xMm, yMm);
    if (target instanceof TableElement) {
      this.convertTable(target, controller);
      return;
    }
    this.createTable(xMm, yMm, controller);
  }

  /**
   * 좌표를 고르지 않았으면 기존 내용 아래에 새 표를 만든다.
   *
   * 배치 영역 왼쪽 위에 두면 제목이나 이미 놓은 요소를 덮어 사용자가 방금 만든
   * 표를 찾지 못한다. 표는 폭이 넓어서 겹침이 특히 눈에 띈다.
   */
  place(controller: EditorController): void {
    const content = controller.getTemplate().page.contentFrame();
    const elements = controller.getTemplate().getElements();
    const lowest = elements.length === 0
      ? content.y
      : Math.max(...elements.map((element) => element.frame.y + element.frame.height))
        + ArrayDrag.GAP_MM;
    const maximum = content.y + content.height - this.defaultHeight();
    this.createTable(content.x, Math.min(Math.max(content.y, lowest), maximum), controller);
  }

  /**
   * 기존 표의 열 너비 합계를 유지하며 Source와 열을 함께 교체한다.
   *
   * 두 변경을 하나의 명령으로 기록하는 이유는 사용자가 한 번 놓은 행동을
   * Undo 두 번으로 되돌리게 만들지 않기 위해서다.
   */
  private convertTable(table: TableElement, controller: EditorController): void {
    const discardedRows = this.tableEditor.discardedRowCount(table);
    const converted = this.tableEditor.bindArray(table, this.arrayPath, this.children);
    controller.execute(new ChangeElementCommand(table, converted));
    controller.selectElement(table.id);
    if (discardedRows === 0) return;
    controller.setNotice(
      `직접 입력한 ${discardedRows}행이 데이터 배열로 바뀌었습니다. ⌘Z로 되돌릴 수 있습니다.`,
    );
  }

  /** 놓은 자리에 자식 스키마로 열이 구성된 데이터 표를 만든다. */
  private createTable(xMm: number, yMm: number, controller: EditorController): void {
    const content = controller.getTemplate().page.contentFrame();
    const width = Math.min(content.width, content.x + content.width - xMm);
    const element = new TableElement(
      this.createId(),
      new Frame(xMm, yMm, width, this.defaultHeight()),
      this.nextZIndex(controller),
      false,
      new BoundTableSource(new Binding(this.arrayPath)),
      this.columnPlanner.fromArrayChildren(this.children, width),
      ArrayDrag.DEFAULT_ROW_HEIGHT_MM,
      new TextStyle("Pretendard", 9, { weight: 700 }),
      new TextStyle("Pretendard", 9),
      true,
      "clip",
    );
    controller.execute(new AddElementCommand(element));
    controller.selectElement(element.id);
    controller.activateSelectTool();
  }

  /** 헤더 한 줄과 본문 세 줄이 들어가는 높이를 기본값으로 둔다. */
  private defaultHeight(): number {
    return ArrayDrag.DEFAULT_ROW_HEIGHT_MM * (ArrayDrag.DEFAULT_BODY_ROWS + 1);
  }

}
