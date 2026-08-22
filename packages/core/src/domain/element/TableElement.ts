import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { Element, type ElementCommonChanges } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";
import { TableColumn } from "./TableColumn.js";
import { TableSource } from "./TableSource.js";

/** 표가 영역을 넘을 때 MVP에서 지원하는 처리 방법을 제한한다. */
export type TableOverflow = "clip";

/**
 * 고정 셀이나 사람마다 행 수가 다른 반복 데이터를 하나의 표 영역으로 표현한다.
 */
export class TableElement extends Element {
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
  ) {
    super(id, frame, z, locked, hidden);
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

  /** 열 구조 변경이 위치·행·스타일 설정을 잃지 않도록 새 표를 반환한다. */
  withColumns(columns: readonly TableColumn[]): TableElement {
    return this.copy({ columns });
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
      overflow: this.overflow,
    };
  }

  /** 표 변경 메서드들이 같은 생성자 복사 규칙을 공유하게 한다. */
  private copy(
    changes: Readonly<{
      source?: TableSource;
      columns?: readonly TableColumn[];
      rowHeight?: number;
      showHeader?: boolean;
      headerStyle?: TextStyle;
      cellStyle?: TextStyle;
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
    );
  }
}
