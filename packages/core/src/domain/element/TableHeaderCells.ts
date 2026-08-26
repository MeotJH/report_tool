/**
 * 표 안에서 머리글처럼 보여야 하는 열과 행을 보존한다.
 *
 * 머리글은 스타일이 아니라 **의미**다. "이 칸은 값이 아니라 값의 이름이다"를
 * 저장해야 굵기·배경이 바뀌어도 무엇이 머리글인지가 남는다. 색과 굵기를 칸마다
 * 따로 저장하면 같은 표 안에서 머리글이 서로 다르게 보이는 것을 막을 수 없다.
 *
 * 위치를 index로 갖기 때문에 열과 행이 추가·삭제되면 함께 옮겨야 한다. 그 규칙을
 * 이 값 객체가 직접 갖고, 편집기는 결과만 받는다.
 */
export class TableHeaderCells {
  public readonly columns: readonly number[];
  public readonly rows: readonly number[];

  /** 중복과 순서 차이가 같은 지정을 다른 값으로 만들지 않게 정규화한다. */
  constructor(columns: readonly number[] = [], rows: readonly number[] = []) {
    this.columns = TableHeaderCells.normalize(columns);
    this.rows = TableHeaderCells.normalize(rows);
  }

  /** 머리글 지정이 없는 표의 기본 상태를 이름으로 드러낸다. */
  static none(): TableHeaderCells {
    return new TableHeaderCells();
  }

  /** 저장된 데이터를 값 객체로 복원하되 없는 필드는 지정 없음으로 본다. */
  static fromJSON(value: unknown): TableHeaderCells {
    if (value === null || typeof value !== "object") return TableHeaderCells.none();
    const json = value as Record<string, unknown>;
    return new TableHeaderCells(
      TableHeaderCells.readIndexes(json.columns),
      TableHeaderCells.readIndexes(json.rows),
    );
  }

  /** 지정한 열 전체가 머리글인지 알려 준다. */
  hasColumn(index: number): boolean {
    return this.columns.includes(index);
  }

  /** 지정한 본문 행 전체가 머리글인지 알려 준다. */
  hasRow(index: number): boolean {
    return this.rows.includes(index);
  }

  /** 머리글 열 지정을 켜고 끈 새 값을 반환해 토글을 Undo 가능하게 한다. */
  toggleColumn(index: number): TableHeaderCells {
    return new TableHeaderCells(TableHeaderCells.toggled(this.columns, index), this.rows);
  }

  /** 머리글 행 지정을 켜고 끈 새 값을 반환한다. */
  toggleRow(index: number): TableHeaderCells {
    return new TableHeaderCells(this.columns, TableHeaderCells.toggled(this.rows, index));
  }

  /** 열이 끼어들 때 그 뒤의 머리글 지정을 한 칸씩 밀어 같은 열을 계속 가리키게 한다. */
  withColumnInserted(index: number): TableHeaderCells {
    return new TableHeaderCells(TableHeaderCells.shifted(this.columns, index), this.rows);
  }

  /** 열이 사라질 때 그 지정을 버리고 뒤의 지정을 당긴다. */
  withColumnRemoved(index: number): TableHeaderCells {
    return new TableHeaderCells(TableHeaderCells.unshifted(this.columns, index), this.rows);
  }

  /** 행이 끼어들 때 그 뒤의 머리글 지정을 한 칸씩 민다. */
  withRowInserted(index: number): TableHeaderCells {
    return new TableHeaderCells(this.columns, TableHeaderCells.shifted(this.rows, index));
  }

  /** 행이 사라질 때 그 지정을 버리고 뒤의 지정을 당긴다. */
  withRowRemoved(index: number): TableHeaderCells {
    return new TableHeaderCells(this.columns, TableHeaderCells.unshifted(this.rows, index));
  }

  /** 열 구조가 통째로 교체될 때 범위를 벗어난 지정이 남지 않게 한다. */
  clampedToColumns(count: number): TableHeaderCells {
    return new TableHeaderCells(this.columns.filter((index) => index < count), this.rows);
  }

  /** 머리글 지정을 클래스 구현과 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return { columns: [...this.columns], rows: [...this.rows] };
  }

  /** 저장된 값에서 표 위치로 쓸 수 있는 0 이상의 정수만 남긴다. */
  private static readIndexes(value: unknown): readonly number[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is number => Number.isInteger(item) && item >= 0);
  }

  /** 지정 목록을 중복 없이 오름차순으로 만든다. */
  private static normalize(indexes: readonly number[]): readonly number[] {
    return [...new Set(indexes)].sort((first, second) => first - second);
  }

  /** 이미 있으면 빼고 없으면 넣는다. */
  private static toggled(indexes: readonly number[], index: number): readonly number[] {
    return indexes.includes(index)
      ? indexes.filter((candidate) => candidate !== index)
      : [...indexes, index];
  }

  /** 삽입 위치 이후의 지정을 뒤로 한 칸 민다. */
  private static shifted(indexes: readonly number[], index: number): readonly number[] {
    return indexes.map((candidate) => (candidate >= index ? candidate + 1 : candidate));
  }

  /** 삭제된 지정을 버리고 그 뒤의 지정을 앞으로 한 칸 당긴다. */
  private static unshifted(indexes: readonly number[], index: number): readonly number[] {
    return indexes
      .filter((candidate) => candidate !== index)
      .map((candidate) => (candidate > index ? candidate - 1 : candidate));
  }
}
