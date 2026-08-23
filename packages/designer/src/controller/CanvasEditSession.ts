import {
  StaticTableSource,
  TableElement,
  TextElement,
  type Frame,
  type TextStyle,
} from "@report-tool/core";
import type { CanvasEditTarget } from "./CanvasEditTarget.js";
import type { EditorActions } from "./EditorActions.js";
import type { EditorController } from "./EditorController.js";
import { TableCellLocator } from "./TableCellLocator.js";
import { TableCellValueParser } from "./TableCellValueParser.js";

/**
 * 캔버스 위 입력기가 필요한 정보를 편집 대상 종류와 무관하게 제공한다.
 *
 * 입력기는 어디에 뜨고 무엇을 보여주고 무엇을 확정하는지만 알면 된다.
 * 그 답이 대상마다 다르므로 종류별 전략으로 나눠 화면 코드에 조건문이 없게 한다.
 */
export abstract class CanvasEditSession {
  /** 편집 대상이 실제로 편집 가능한 상태일 때만 세션을 만든다. */
  static create(
    target: CanvasEditTarget,
    controller: EditorController,
  ): CanvasEditSession | null {
    const element = controller.getElement(target.elementId);
    if (target.kind === "text") {
      return element instanceof TextElement ? new TextEditSession(element) : null;
    }
    if (!(element instanceof TableElement)) return null;
    if (target.kind === "tableHeader") {
      return new TableHeaderEditSession(element, target);
    }
    return element.source instanceof StaticTableSource
      ? new TableCellEditSession(element, target)
      : null;
  }

  /** 입력기를 요소와 정확히 겹치게 놓을 문서 영역을 제공한다. */
  abstract frame(): Frame;

  /** 입력기에 처음 채워 넣을 현재 값을 제공한다. */
  abstract value(): string;

  /** 입력 중 글자가 확정 후와 같은 모양으로 보이게 스타일을 제공한다. */
  abstract style(): TextStyle;

  /** 확정된 입력을 대상에 맞는 하나의 명령으로 기록한다. */
  abstract commit(input: string, actions: EditorActions): void;

  /** Tab으로 옮겨 갈 다음 대상을 알려준다. 없으면 입력을 끝낸다. */
  abstract next(direction: 1 | -1): CanvasEditTarget | undefined;
}

/** 고정 문구 요소의 내용을 요소 영역 전체에서 편집한다. */
class TextEditSession extends CanvasEditSession {
  /** 편집 대상 요소를 세션 수명 동안 보존한다. */
  constructor(private readonly element: TextElement) {
    super();
  }

  /** 문구는 요소 영역 전체를 차지한다. */
  frame(): Frame {
    return this.element.frame;
  }

  /** 저장된 문구를 그대로 보여준다. */
  value(): string {
    return this.element.content.value;
  }

  /** 요소에 지정된 글자 표현을 그대로 사용한다. */
  style(): TextStyle {
    return this.element.style;
  }

  /** 문구 종류를 유지한 채 내용만 바꾼다. */
  commit(input: string, actions: EditorActions): void {
    actions.commitTextContent(this.element, input);
  }

  /** 단일 문구에는 이동할 다음 칸이 없다. */
  next(): undefined {
    return undefined;
  }
}

/** 표의 모든 편집 대상이 같은 영역·이동 계산을 공유하게 한다. */
abstract class TableEditSession extends CanvasEditSession {
  protected readonly locator = new TableCellLocator();

  /** 대상 표와 위치를 세션 수명 동안 보존한다. */
  constructor(
    protected readonly table: TableElement,
    protected readonly target: CanvasEditTarget,
  ) {
    super();
  }

  /** 입력기가 정확히 그 셀 한 칸만 덮게 한다. */
  frame(): Frame {
    return this.locator.frameOf(this.table, this.target);
  }

  /** Tab 이동 순서는 표 구조가 정하게 한다. */
  next(direction: 1 | -1): CanvasEditTarget | undefined {
    return this.locator.nextTarget(this.table, this.target, direction);
  }
}

/** 사용자가 정하는 열 제목을 편집한다. */
class TableHeaderEditSession extends TableEditSession {
  /** 저장된 헤더 문구를 보여준다. */
  value(): string {
    return this.columnIndex() === undefined
      ? ""
      : this.table.columns[this.columnIndex()!]?.header ?? "";
  }

  /** 헤더 행에 지정된 글자 표현을 사용한다. */
  style(): TextStyle {
    return this.table.headerStyle;
  }

  /** 헤더만 바꿔 열의 데이터 연결을 건드리지 않는다. */
  commit(input: string, actions: EditorActions): void {
    const index = this.columnIndex();
    if (index === undefined) return;
    actions.commitTableHeader(this.table.id, index, input);
  }

  /** 헤더 대상에서만 열 위치를 꺼낸다. */
  private columnIndex(): number | undefined {
    return this.target.kind === "tableHeader" ? this.target.columnIndex : undefined;
  }
}

/** 템플릿에 저장되는 정적 셀 값을 편집한다. */
class TableCellEditSession extends TableEditSession {
  private readonly valueParser = new TableCellValueParser();

  /** 저장된 셀 값을 입력기가 다룰 문자열로 보여준다. */
  value(): string {
    const position = this.position();
    if (position === undefined) return "";
    const rows = (this.table.source as StaticTableSource).rows;
    const row = rows[position.rowIndex];
    const key = this.table.columns[position.columnIndex]?.key;
    if (row === undefined || key === undefined) return "";
    return this.valueParser.format(row[key]);
  }

  /** 본문 행에 지정된 글자 표현을 사용한다. */
  style(): TextStyle {
    return this.table.cellStyle;
  }

  /** 입력을 해석해 저장 가능한 셀 값으로 기록한다. */
  commit(input: string, actions: EditorActions): void {
    const position = this.position();
    if (position === undefined) return;
    const key = this.table.columns[position.columnIndex]?.key;
    if (key === undefined) return;
    actions.commitTableCell(this.table.id, position.rowIndex, key, input);
  }

  /** 셀 대상에서만 행과 열 위치를 꺼낸다. */
  private position(): Readonly<{ rowIndex: number; columnIndex: number }> | undefined {
    if (this.target.kind !== "tableCell") return undefined;
    return { rowIndex: this.target.rowIndex, columnIndex: this.target.columnIndex };
  }
}
