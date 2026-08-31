import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { Element, type ElementCommonChanges } from "./Element.js";
import type { ElementFollow } from "./ElementFollow.js";
import type { ElementVisitor } from "./ElementVisitor.js";
import { TableColumn } from "./TableColumn.js";
import { TableHeaderCells } from "./TableHeaderCells.js";
import { TableSource } from "./TableSource.js";

/** 표가 영역을 넘을 때 MVP에서 지원하는 처리 방법을 제한한다. */
export type TableOverflow = "clip";

/**
 * 고정 셀이나 사람마다 행 수가 다른 반복 데이터를 하나의 표 영역으로 표현한다.
 */
export class TableElement extends Element {
  /** 머리글 칸이 본문과 구분되어 보이는 최소한의 기본 배경을 정한다. */
  public static readonly DEFAULT_HEADER_FILL = "#eef2f7";

  public readonly type = "table";
  public readonly columns: readonly TableColumn[];

  /** 정적·데이터 Source와 열·행 표현 설정을 하나의 불변 요소로 구성한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    public readonly source: TableSource,
    columns: readonly TableColumn[],
    public readonly rowHeight: number,
    public readonly headerStyle: TextStyle,
    public readonly cellStyle: TextStyle,
    public readonly showHeader: boolean,
    public readonly overflow: TableOverflow,
    hidden = false,
    public readonly headerCells: TableHeaderCells = TableHeaderCells.none(),
    public readonly headerFill: string | null = TableElement.DEFAULT_HEADER_FILL,
    pageIndex = 0,
    repeated = false,
    follows: ElementFollow | null = null,
    /**
     * 칸 테두리와 글자 사이에 두는 여백(mm)이다.
     *
     * 없으면 글자가 선에 닿아 읽기 나쁘고, 줄바꿈 폭이 칸 폭과 같아져 마지막
     * 글자가 선에 붙는다. 이 값은 그리는 자리뿐 아니라 **줄을 재는 폭**에도
     * 적용된다. 한쪽에만 적용하면 화면에서 한 줄이던 칸이 발행본에서 두 줄이 된다.
     */
    public readonly cellPadding = 0,
  ) {
    super(id, frame, z, locked, hidden, pageIndex, repeated, follows);
    this.columns = [...columns];
  }

  /** 방문자가 반복 표 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitTable(this);
  }

  /** 행 공급 방식만 교체해 정적 표와 데이터 표 전환을 불변 연산으로 표현한다. */
  withSource(source: TableSource): TableElement {
    return this.copy({ source });
  }

  /**
   * 열 구조 변경이 위치·행·스타일 설정을 잃지 않도록 새 표를 반환한다.
   *
   * 머리글 지정은 열 번호로 저장되므로 열이 줄면 없는 열을 가리키게 된다.
   * 그대로 두면 화면에는 아무 표시가 없는데 저장 JSON에만 남는다.
   */
  withColumns(columns: readonly TableColumn[]): TableElement {
    return this.copy({
      columns,
      headerCells: this.headerCells.clampedToColumns(columns.length),
    });
  }

  /** 어떤 열과 행이 머리글인지만 교체한 새 표를 반환한다. */
  withHeaderCells(headerCells: TableHeaderCells): TableElement {
    return this.copy({ headerCells });
  }

  /** 칸 안쪽 여백만 교체한 새 표를 반환한다. */
  withCellPadding(cellPadding: number): TableElement {
    return this.copy({ cellPadding });
  }

  /** 글자를 그리고 재는 데 실제로 쓸 수 있는 칸 폭을 준다. */
  innerWidthMm(widthMm: number): number {
    return Math.max(0, widthMm - this.cellPadding * 2);
  }

  /** 머리글 칸 배경만 교체한다. null이면 칠하지 않는다. */
  withHeaderFill(headerFill: string | null): TableElement {
    return this.copy({ headerFill });
  }

  /** 모든 행이 공유하는 mm 높이만 교체한 새 표를 반환한다. */
  withRowHeight(rowHeight: number): TableElement {
    return this.copy({ rowHeight });
  }

  /** 헤더 행 표시 상태만 교체해 토글을 Undo 가능한 값 변경으로 만든다. */
  withHeaderVisibility(showHeader: boolean): TableElement {
    return this.copy({ showHeader });
  }

  /** 헤더와 본문 글자 표현을 한 번의 Inspector 변경으로 교체하게 한다. */
  withStyles(styles: Readonly<{ headerStyle?: TextStyle; cellStyle?: TextStyle }>): TableElement {
    return this.copy({
      headerStyle: styles.headerStyle,
      cellStyle: styles.cellStyle,
    });
  }

  /** 표의 Source·열·스타일 설정을 보존하면서 공통 배치 상태만 바꾼다. */
  protected withCommon(changes: ElementCommonChanges): TableElement {
    return this.copy({}, changes);
  }

  /** 반복 표의 고유 속성을 렌더러와 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      source: this.source.toJSON(),
      columns: this.columns.map((column) => column.toJSON()),
      rowHeight: this.rowHeight,
      headerStyle: this.headerStyle.toJSON(),
      cellStyle: this.cellStyle.toJSON(),
      showHeader: this.showHeader,
      headerCells: this.headerCells.toJSON(),
      headerFill: this.headerFill,
      cellPadding: this.cellPadding,
      overflow: this.overflow,
    };
  }

  /**
   * 표 변경 메서드들이 같은 생성자 복사 규칙을 공유하게 한다.
   *
   * `headerFill`은 "칠하지 않음"을 null로 표현하므로 `??`로 합치면 지우기가
   * 조용히 무시된다. 키가 왔는지로 판단해 null도 값으로 받는다.
   */
  private copy(
    changes: Readonly<{
      source?: TableSource;
      columns?: readonly TableColumn[];
      rowHeight?: number;
      showHeader?: boolean;
      headerStyle?: TextStyle;
      cellStyle?: TextStyle;
      headerCells?: TableHeaderCells;
      headerFill?: string | null;
      cellPadding?: number;
    }>,
    common: ElementCommonChanges = {},
  ): TableElement {
    const resolved = this.mergeCommon(common);
    return new TableElement(
      this.id, resolved.frame, resolved.z, resolved.locked,
      changes.source ?? this.source, changes.columns ?? this.columns,
      changes.rowHeight ?? this.rowHeight,
      changes.headerStyle ?? this.headerStyle,
      changes.cellStyle ?? this.cellStyle,
      changes.showHeader ?? this.showHeader, this.overflow, resolved.hidden,
      changes.headerCells ?? this.headerCells,
      "headerFill" in changes ? changes.headerFill ?? null : this.headerFill,
      resolved.pageIndex,
      resolved.repeated,
      resolved.follows,
      changes.cellPadding ?? this.cellPadding,
    );
  }
}
