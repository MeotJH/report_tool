import {
  type TableCellValue,
  TableColumn,
  TableElement,
  TableSource,
  type Template,
} from "@report-tool/core";
import { TableEditor } from "../controller/TableEditor.js";
import { EditorCommand } from "./EditorCommand.js";

/** 모든 표 명령이 같은 타입 검증과 이전 상태 복원 규칙을 사용하게 한다. */
abstract class TableCommand extends EditorCommand {
  private beforeTable: TableElement | null = null;
  protected readonly editor = new TableEditor();

  /** 여러 표 명령이 같은 요소 식별 방식으로 동작하도록 id를 보존한다. */
  constructor(private readonly elementId: string) {
    super();
  }

  /** 변경 전 표 전체를 보존한 뒤 구체 명령의 한 가지 편집을 적용한다. */
  execute(template: Template): Template {
    return template.replaceElement(this.elementId, (element) => {
      const table = this.asTable(element);
      const changed = this.update(table);
      this.beforeTable = table;
      return changed;
    });
  }

  /** 실행 전에 보존한 불변 표를 되돌려 모든 속성을 정확히 복원한다. */
  undo(template: Template): Template {
    const beforeTable = this.beforeTable;
    if (beforeTable === null) throw new Error("실행하지 않은 표 명령은 취소할 수 없다");
    return template.replaceElement(this.elementId, (element) => {
      this.asTable(element);
      return beforeTable;
    });
  }

  /** 각 구체 명령이 자신에게 필요한 표 변경 하나만 정의하게 한다. */
  protected abstract update(table: TableElement): TableElement;

  /** 잘못 선택한 요소를 표 명령이 조용히 훼손하지 않도록 타입을 검증한다. */
  private asTable(element: object): TableElement {
    if (!(element instanceof TableElement)) {
      throw new Error("TableElement가 아닌 요소는 표 명령으로 변경할 수 없다");
    }
    return element;
  }
}

/** 정적 표의 셀 값 입력을 하나의 Undo 단위로 기록한다. */
export class UpdateTableCellCommand extends TableCommand {
  /** 사용자가 확정한 셀 위치와 값을 재실행 가능한 입력으로 보존한다. */
  constructor(
    elementId: string,
    private readonly rowIndex: number,
    private readonly columnKey: string,
    private readonly value: TableCellValue,
  ) {
    super(elementId);
  }

  /** 정적 Source의 대상 셀만 교체한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.updateCell(table, this.rowIndex, this.columnKey, this.value);
  }
}

/** 정적 표에 빈 행을 추가하는 작업을 독립된 Undo 단위로 기록한다. */
export class AddTableRowCommand extends TableCommand {
  /** 행 삽입 위치를 재실행할 수 있도록 보존한다. */
  constructor(elementId: string, private readonly index: number) {
    super(elementId);
  }

  /** 현재 열 구조를 가진 빈 행을 지정 위치에 삽입한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.insertRow(table, this.index);
  }
}

/** 정적 표의 행 삭제를 복원 가능한 작업으로 기록한다. */
export class RemoveTableRowCommand extends TableCommand {
  /** 삭제할 행 위치를 재실행할 수 있도록 보존한다. */
  constructor(elementId: string, private readonly index: number) {
    super(elementId);
  }

  /** 지정한 정적 행을 제거한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.removeRow(table, this.index);
  }
}

/** 열 정의와 정적 셀 구조를 함께 추가하는 작업을 기록한다. */
export class AddTableColumnCommand extends TableCommand {
  /** 새 열 정의와 삽입 위치를 재실행 가능한 입력으로 보존한다. */
  constructor(
    elementId: string,
    private readonly column: TableColumn,
    private readonly index: number,
  ) {
    super(elementId);
  }

  /** 새 열을 지정 위치에 삽입하고 정적 행에 빈 셀을 만든다. */
  protected update(table: TableElement): TableElement {
    return this.editor.addColumn(table, this.column, this.index);
  }
}

/** 열 정의와 정적 셀 값을 함께 삭제하는 작업을 기록한다. */
export class RemoveTableColumnCommand extends TableCommand {
  /** 삭제할 열 위치를 재실행할 수 있도록 보존한다. */
  constructor(elementId: string, private readonly index: number) {
    super(elementId);
  }

  /** 지정 열과 그 열에 속한 정적 셀 값을 제거한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.removeColumn(table, this.index);
  }
}

/** 헤더 문구 수정을 다른 열 속성과 분리된 Undo 단위로 기록한다. */
export class UpdateTableHeaderCommand extends TableCommand {
  /** 대상 열 위치와 확정한 헤더를 재실행 가능한 입력으로 보존한다. */
  constructor(
    elementId: string,
    private readonly index: number,
    private readonly header: string,
  ) {
    super(elementId);
  }

  /** 대상 열의 헤더만 교체한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.updateHeader(table, this.index, this.header);
  }
}

/** 열 너비 변경을 mm 기반의 독립된 Undo 단위로 기록한다. */
export class ResizeTableColumnCommand extends TableCommand {
  /** 대상 열 위치와 확정한 mm 너비를 재실행 가능한 입력으로 보존한다. */
  constructor(
    elementId: string,
    private readonly index: number,
    private readonly width: number,
  ) {
    super(elementId);
  }

  /** 대상 열의 너비만 교체한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.resizeColumn(table, this.index, this.width);
  }
}

/** 전체 표의 행 높이 변경을 한 번의 Undo 단위로 기록한다. */
export class UpdateTableRowHeightCommand extends TableCommand {
  /** 확정한 mm 행 높이를 재실행 가능한 입력으로 보존한다. */
  constructor(elementId: string, private readonly rowHeight: number) {
    super(elementId);
  }

  /** 표의 공통 행 높이만 교체한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.updateRowHeight(table, this.rowHeight);
  }
}

/** 헤더 표시 전환을 한 번의 Undo 단위로 기록한다. */
export class ToggleTableHeaderCommand extends TableCommand {
  /** 사용자가 선택한 헤더 표시 상태를 재실행 가능한 입력으로 보존한다. */
  constructor(elementId: string, private readonly showHeader: boolean) {
    super(elementId);
  }

  /** 표의 헤더 표시 상태만 교체한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.toggleHeader(table, this.showHeader);
  }
}

/** 정적 표와 데이터 표의 Source 전환을 복원 가능한 작업으로 기록한다. */
export class ChangeTableSourceCommand extends TableCommand {
  /** 사용자가 선택한 새 Source를 재실행 가능한 입력으로 보존한다. */
  constructor(elementId: string, private readonly source: TableSource) {
    super(elementId);
  }

  /** 열과 스타일을 유지한 채 Source만 교체한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.changeSource(table, this.source);
  }
}

/** 데이터 토큰을 표 열에 연결하는 작업을 독립된 Undo 단위로 기록한다. */
export class BindTableColumnCommand extends TableCommand {
  /** 필드 key와 헤더 정책을 재실행 가능한 입력으로 보존한다. */
  constructor(
    elementId: string,
    private readonly index: number,
    private readonly fieldKey: string,
    private readonly suggestedHeader: string,
    private readonly replaceHeader: boolean,
  ) {
    super(elementId);
  }

  /** 대상 열을 행 데이터 표현식과 연결한다. */
  protected update(table: TableElement): TableElement {
    return this.editor.bindColumn(
      table, this.index, this.fieldKey, this.suggestedHeader, this.replaceHeader,
    );
  }
}

/** 열 하나를 머리글 열로 지정하거나 해제하는 것을 Undo 단위로 기록한다. */
export class ToggleHeaderColumnCommand extends TableCommand {
  /** 어떤 열의 머리글 지정을 뒤집을지 보존한다. */
  constructor(elementId: string, private readonly index: number) {
    super(elementId);
  }

  /** 지정 여부만 뒤집고 열의 데이터 연결과 너비는 그대로 둔다. */
  protected update(table: TableElement): TableElement {
    return this.editor.toggleHeaderColumn(table, this.index);
  }
}

/** 정적 행 하나를 머리글 행으로 지정하거나 해제하는 것을 Undo 단위로 기록한다. */
export class ToggleHeaderRowCommand extends TableCommand {
  /** 어떤 행의 머리글 지정을 뒤집을지 보존한다. */
  constructor(elementId: string, private readonly index: number) {
    super(elementId);
  }

  /** 지정 여부만 뒤집고 행에 입력한 값은 그대로 둔다. */
  protected update(table: TableElement): TableElement {
    return this.editor.toggleHeaderRow(table, this.index);
  }
}

/** 머리글 칸 배경 변경을 Undo 단위로 기록한다. */
export class ChangeHeaderFillCommand extends TableCommand {
  /** 적용할 배경색을 보존한다. null은 칠하지 않음을 뜻한다. */
  constructor(elementId: string, private readonly headerFill: string | null) {
    super(elementId);
  }

  /** 배경만 교체하고 어떤 칸이 머리글인지는 그대로 둔다. */
  protected update(table: TableElement): TableElement {
    return this.editor.changeHeaderFill(table, this.headerFill);
  }
}
