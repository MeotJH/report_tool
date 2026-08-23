import {
  BoundTableSource,
  StaticTableSource,
  TableColumn,
  type TableCellValue,
  TableElement,
  TableSource,
} from "@report-tool/core";

/** 표 편집 규칙을 UI 이벤트와 분리해 Command와 이후 속성 패널이 함께 사용하게 한다. */
export class TableEditor {
  /** 데이터 표의 원본을 훼손하지 않도록 정적 표에서만 셀 값을 교체한다. */
  updateCell(
    table: TableElement,
    rowIndex: number,
    columnKey: string,
    value: TableCellValue,
  ): TableElement {
    this.assertColumnKey(table, columnKey);
    const source = this.staticSource(table, "셀");
    return table.withSource(source.withCell(rowIndex, columnKey, value));
  }

  /** 새 정적 행이 현재 모든 열을 갖도록 열 구조를 기준으로 빈 행을 삽입한다. */
  insertRow(table: TableElement, index: number): TableElement {
    const source = this.staticSource(table, "행");
    const columnKeys = table.columns.map((column) => column.key);
    return table.withSource(source.insertRow(index, columnKeys));
  }

  /** 외부 데이터 배열을 편집하지 않도록 정적 표의 행만 제거한다. */
  removeRow(table: TableElement, index: number): TableElement {
    const source = this.staticSource(table, "행");
    return table.withSource(source.removeRow(index));
  }

  /** 열 정의와 정적 행의 셀 구조가 어긋나지 않도록 두 값을 함께 추가한다. */
  addColumn(table: TableElement, column: TableColumn, index: number): TableElement {
    this.assertColumnInsertIndex(table, index);
    this.assertUniqueColumnKey(table, column.key);
    const columns = [...table.columns];
    columns.splice(index, 0, column);
    return this.withAddedSourceColumn(table.withColumns(columns), column.key);
  }

  /** 열 정의를 삭제할 때 정적 행에 남은 사용하지 않는 셀 값도 함께 제거한다. */
  removeColumn(table: TableElement, index: number): TableElement {
    if (table.columns.length === 1) throw new Error("표에는 열이 하나 이상 필요하다");
    const removed = this.columnAt(table, index);
    const columns = table.columns.filter((_column, columnIndex) => columnIndex !== index);
    return this.withRemovedSourceColumn(table.withColumns(columns), removed.key);
  }

  /** 헤더 문구 변경이 열의 데이터 연결과 표시 설정을 잃지 않게 한다. */
  updateHeader(table: TableElement, index: number, header: string): TableElement {
    return table.withColumns(this.replaceColumn(table, index, this.columnAt(table, index).withHeader(header)));
  }

  /** 열 너비가 렌더링 불가능한 값이 되는 것을 막고 나머지 열 설정을 보존한다. */
  resizeColumn(table: TableElement, index: number, width: number): TableElement {
    if (width <= 0) throw new Error("표 열 너비는 0보다 커야 한다");
    return table.withColumns(this.replaceColumn(table, index, this.columnAt(table, index).withWidth(width)));
  }

  /** 행 높이를 mm 양수로 제한해 캔버스와 PDF가 같은 배치를 계산하게 한다. */
  updateRowHeight(table: TableElement, rowHeight: number): TableElement {
    if (rowHeight <= 0) throw new Error("표 행 높이는 0보다 커야 한다");
    return table.withRowHeight(rowHeight);
  }

  /** 헤더 표시 여부를 다른 표 속성과 독립적인 편집 값으로 교체한다. */
  toggleHeader(table: TableElement, showHeader: boolean): TableElement {
    return table.withHeaderVisibility(showHeader);
  }

  /** 정적·데이터 표 전환 시 기존 Source를 불변 인스턴스에 남겨 Undo가 복원하게 한다. */
  changeSource(table: TableElement, source: TableSource): TableElement {
    return table.withSource(source);
  }

  /** 데이터 토큰을 열 표현식으로 바꾸되 사용자가 정한 헤더의 보존 여부를 선택하게 한다. */
  bindColumn(
    table: TableElement,
    index: number,
    fieldKey: string,
    suggestedHeader: string,
    replaceHeader: boolean,
  ): TableElement {
    this.assertBoundSource(table);
    this.assertFieldKey(fieldKey);
    const column = this.columnAt(table, index);
    const header = replaceHeader ? suggestedHeader : undefined;
    return table.withColumns(this.replaceColumn(table, index, column.withDataField(fieldKey, header)));
  }

  /**
   * 표 안의 가로 위치가 몇 번째 열인지 알려준다.
   *
   * 열 경계 드래그와 데이터 Token 드롭이 같은 판정을 써야 사용자가 본 열과
   * 실제로 바뀌는 열이 어긋나지 않는다.
   */
  columnIndexAtOffset(table: TableElement, offsetMm: number): number | undefined {
    if (offsetMm < 0) return undefined;
    let edge = 0;
    for (const [index, column] of table.columns.entries()) {
      edge += column.width;
      if (offsetMm < edge) return index;
    }
    return undefined;
  }

  /** 행 변경 동작이 템플릿에 저장된 정적 데이터만 수정하도록 Source 종류를 좁힌다. */
  private staticSource(table: TableElement, target: "셀" | "행"): StaticTableSource {
    if (!(table.source instanceof StaticTableSource)) {
      throw new Error(`정적 표의 ${target}만 직접 편집할 수 있다`);
    }
    return table.source;
  }

  /** 데이터 토큰이 데이터 Source가 없는 표에 실수로 연결되는 것을 차단한다. */
  private assertBoundSource(table: TableElement): void {
    if (!(table.source instanceof BoundTableSource)) {
      throw new Error("데이터 표의 열에만 데이터 Token을 연결할 수 있다");
    }
  }

  /** 열 위치 기반 편집이 존재하는 열에만 적용되도록 범위를 검증한다. */
  private columnAt(table: TableElement, index: number): TableColumn {
    const column = table.columns[index];
    if (column === undefined) throw new Error(`표 열 ${index}를 찾을 수 없다`);
    return column;
  }

  /** 새 열이 첫 위치부터 마지막 다음 위치 사이에만 삽입되도록 검증한다. */
  private assertColumnInsertIndex(table: TableElement, index: number): void {
    if (index < 0 || index > table.columns.length) {
      throw new Error(`표 열 삽입 위치 ${index}가 올바르지 않다`);
    }
  }

  /** 행 객체의 키 충돌로 기존 셀 값이 덮이는 것을 사전에 막는다. */
  private assertUniqueColumnKey(table: TableElement, columnKey: string): void {
    if (table.columns.some((column) => column.key === columnKey)) {
      throw new Error(`표 열 key ${columnKey}가 이미 존재한다`);
    }
  }

  /** 직접 셀 입력이 화면에 존재하는 열만 대상으로 하도록 key를 검증한다. */
  private assertColumnKey(table: TableElement, columnKey: string): void {
    if (!table.columns.some((column) => column.key === columnKey)) {
      throw new Error(`표 열 key ${columnKey}를 찾을 수 없다`);
    }
  }

  /** 토큰 key를 안전한 점 경로 문자로 제한해 표현식 구조가 깨지지 않게 한다. */
  private assertFieldKey(fieldKey: string): void {
    if (!/^[A-Za-z0-9_.]+$/.test(fieldKey)) {
      throw new Error("데이터 Token key 형식이 올바르지 않다");
    }
  }

  /** 지정 위치의 열 하나만 교체한 새 배열을 만들어 원본 열 배열을 보존한다. */
  private replaceColumn(
    table: TableElement,
    index: number,
    replacement: TableColumn,
  ): readonly TableColumn[] {
    return table.columns.map((column, columnIndex) => (
      columnIndex === index ? replacement : column
    ));
  }

  /** 정적 표일 때만 새 열의 빈 셀을 Source에 추가하고 데이터 표는 그대로 둔다. */
  private withAddedSourceColumn(table: TableElement, columnKey: string): TableElement {
    if (!(table.source instanceof StaticTableSource)) return table;
    return table.withSource(table.source.addColumn(columnKey));
  }

  /** 정적 표일 때만 삭제한 열의 셀 값을 Source에서 제거한다. */
  private withRemovedSourceColumn(table: TableElement, columnKey: string): TableElement {
    if (!(table.source instanceof StaticTableSource)) return table;
    return table.withSource(table.source.removeColumn(columnKey));
  }
}
