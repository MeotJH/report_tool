import { Binding } from "../value/Binding.js";

/** 정적 표 셀에 저장할 수 있는 JSON 호환 원시값을 제한한다. */
export type TableCellValue = string | number | boolean | null;

/** 열 key로 셀 값을 찾는 불변 정적 행의 형태를 정의한다. */
export type TableRow = Readonly<Record<string, TableCellValue>>;

/** 표가 반복 행을 어디서 얻는지 렌더러와 UI가 다형적으로 사용하게 한다. */
export abstract class TableSource {
  public abstract readonly kind: "static" | "bound";

  /** 템플릿 데이터 또는 발행 데이터를 실제 반복 행 목록으로 해석한다. */
  abstract resolveRows(data: unknown): readonly unknown[];

  /**
   * 행 수가 발행 시점에야 정해지는 출처인지 알린다.
   *
   * 편집 중 행이 하나도 없을 때 무엇을 보여 줄지가 이 답에 달려 있다. 사람마다
   * 달라지는 표는 아직 비어 있어도 형태를 보여 줘야 하지만, 사용자가 행을 모두
   * 지운 표에 없는 행을 만들어 주면 지워지지 않는 행처럼 보인다.
   */
  abstract deferredRows(): boolean;

  /** 구체 클래스 이름과 무관하게 저장 가능한 표 데이터 출처로 변환한다. */
  abstract toJSON(): Record<string, unknown>;
}

/** 모든 발행 문서에서 동일하게 보일 셀 값을 템플릿 자체에 보존한다. */
export class StaticTableSource extends TableSource {
  public readonly kind = "static" as const;
  public readonly rows: readonly TableRow[];

  /** 외부 행 객체 변경이 저장된 템플릿 값을 훼손하지 않도록 각 행을 복사한다. */
  constructor(rows: readonly TableRow[]) {
    super();
    this.rows = rows.map((row) => ({ ...row }));
  }

  /** 정적 표는 외부 발행 데이터 대신 저장한 행을 반복 결과로 제공한다. */
  resolveRows(_data: unknown): readonly TableRow[] {
    return this.rows.map((row) => ({ ...row }));
  }

  /** 정적 표의 행은 템플릿에 저장된 내용 그 자체이므로 지금 이미 정해져 있다. */
  deferredRows(): boolean {
    return false;
  }

  /** 지정 셀만 바꾼 새 Source를 반환해 셀 편집을 Undo 가능한 값 교체로 만든다. */
  withCell(rowIndex: number, columnKey: string, value: TableCellValue): StaticTableSource {
    this.assertRowIndex(rowIndex);
    const rows = this.rows.map((row, index) => (
      index === rowIndex ? { ...row, [columnKey]: value } : row
    ));
    return new StaticTableSource(rows);
  }

  /** 원하는 위치에 빈 행을 삽입한 새 Source를 반환한다. */
  insertRow(index: number, columnKeys: readonly string[]): StaticTableSource {
    if (index < 0 || index > this.rows.length) {
      throw new Error(`표 행 삽입 위치 ${index}가 올바르지 않다`);
    }
    const emptyRow = Object.fromEntries(columnKeys.map((key) => [key, ""]));
    const rows = [...this.rows];
    rows.splice(index, 0, emptyRow);
    return new StaticTableSource(rows);
  }

  /** 지정 행을 제거한 새 Source를 반환해 삭제 전 행을 기존 인스턴스에 보존한다. */
  removeRow(rowIndex: number): StaticTableSource {
    this.assertRowIndex(rowIndex);
    return new StaticTableSource(this.rows.filter((_row, index) => index !== rowIndex));
  }

  /** 새 열이 모든 기존 정적 행에서 빈 셀로 시작하게 한다. */
  addColumn(columnKey: string): StaticTableSource {
    return new StaticTableSource(this.rows.map((row) => ({ ...row, [columnKey]: "" })));
  }

  /** 제거한 열의 셀 값이 저장 JSON에 남지 않도록 각 행에서 함께 제거한다. */
  removeColumn(columnKey: string): StaticTableSource {
    const rows = this.rows.map((row) => {
      const next = { ...row };
      delete next[columnKey];
      return next;
    });
    return new StaticTableSource(rows);
  }

  /** 정적 행을 source 종류와 함께 저장해 데이터 표와 혼동되지 않게 한다. */
  toJSON(): Record<string, unknown> {
    return { kind: this.kind, rows: this.rows.map((row) => ({ ...row })) };
  }

  /** 셀 편집과 행 삭제가 존재하는 행만 대상으로 하도록 범위를 검증한다. */
  private assertRowIndex(rowIndex: number): void {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      throw new Error(`표 행 ${rowIndex}를 찾을 수 없다`);
    }
  }
}

/** 문서마다 달라지는 배열 데이터를 Binding 경로에서 반복 행으로 가져온다. */
export class BoundTableSource extends TableSource {
  public readonly kind = "bound" as const;

  /** 데이터 경로 정책을 기존 Binding 값 객체와 동일하게 유지한다. */
  constructor(public readonly binding: Binding) {
    super();
  }

  /** 바인딩 결과가 배열일 때만 표 행으로 사용해 잘못된 데이터가 렌더링을 깨지 않게 한다. */
  resolveRows(data: unknown): readonly unknown[] {
    const value = this.binding.path.resolve(data);
    return Array.isArray(value) ? value : [];
  }

  /** 데이터 표의 행 수는 발행할 문서의 데이터가 정한다. */
  deferredRows(): boolean {
    return true;
  }

  /** 데이터 경로와 포맷 정책을 source 종류 안에 함께 저장한다. */
  toJSON(): Record<string, unknown> {
    return { kind: this.kind, binding: this.binding.toJSON() };
  }
}
