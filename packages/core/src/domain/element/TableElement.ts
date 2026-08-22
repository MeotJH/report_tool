import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import { TextStyle } from "../value/TextStyle.js";
import { Element } from "./Element.js";
import type { ElementVisitor } from "./ElementVisitor.js";
import { TableColumn } from "./TableColumn.js";

/** 표가 영역을 넘을 때 MVP에서 지원하는 처리 방법을 제한한다. */
export type TableOverflow = "clip";

/**
 * 사람마다 행 수가 다른 반복 데이터를 하나의 표 영역으로 표현한다.
 */
export class TableElement extends Element {
  public readonly type = "table";
  public readonly columns: readonly TableColumn[];

  /** 반복 데이터 경로와 열·행 표현 설정을 하나의 불변 요소로 구성한다. */
  constructor(
    id: string,
    frame: Frame,
    z: number,
    locked: boolean,
    public readonly binding: Binding,
    columns: readonly TableColumn[],
    public readonly rowHeight: number,
    public readonly headerStyle: TextStyle,
    public readonly cellStyle: TextStyle,
    public readonly showHeader: boolean,
    public readonly overflow: TableOverflow,
  ) {
    super(id, frame, z, locked);
    this.columns = [...columns];
  }

  /** 방문자가 반복 표 전용 처리 경로를 사용하도록 연결한다. */
  accept<TResult>(visitor: ElementVisitor<TResult>): TResult {
    return visitor.visitTable(this);
  }

  /** 표의 데이터·열·스타일 설정을 보존하면서 배치 영역만 바꾼다. */
  withFrame(frame: Frame): TableElement {
    return new TableElement(
      this.id,
      frame,
      this.z,
      this.locked,
      this.binding,
      this.columns,
      this.rowHeight,
      this.headerStyle,
      this.cellStyle,
      this.showHeader,
      this.overflow,
    );
  }

  /** 반복 표의 고유 속성을 렌더러와 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      binding: this.binding.toJSON(),
      columns: this.columns.map((column) => column.toJSON()),
      rowHeight: this.rowHeight,
      headerStyle: this.headerStyle.toJSON(),
      cellStyle: this.cellStyle.toJSON(),
      showHeader: this.showHeader,
      overflow: this.overflow,
    };
  }
}
