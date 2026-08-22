import type { FormatSpec } from "../format/FormatSpec.js";

/** 표 안에서 지원하는 셀 가로 정렬을 제한한다. */
export type TableColumnAlign = "left" | "center" | "right";

/**
 * 반복 행의 한 열이 어떤 값을 어떤 너비와 표현으로 보여줄지 보존한다.
 */
export class TableColumn {
  /** 열 설정을 렌더링 동작 없이 직렬화 가능한 값으로 구성한다. */
  constructor(
    public readonly key: string,
    public readonly header: string,
    public readonly cellTemplate: string,
    public readonly width: number,
    public readonly align: TableColumnAlign,
    public readonly formatSpec: FormatSpec | null,
  ) {}

  /** 열 설정을 클래스 구현과 무관한 저장 데이터로 변환한다. */
  toJSON(): Record<string, unknown> {
    return {
      key: this.key,
      header: this.header,
      cellTemplate: this.cellTemplate,
      width: this.width,
      align: this.align,
      formatSpec: this.formatSpec,
    };
  }
}
