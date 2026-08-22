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

  /** 열의 데이터 연결과 표현을 유지하면서 사용자가 입력한 헤더만 교체한다. */
  withHeader(header: string): TableColumn {
    return new TableColumn(
      this.key, header, this.cellTemplate, this.width, this.align, this.formatSpec,
    );
  }

  /** 열의 나머지 설정을 유지하면서 mm 너비만 교체한다. */
  withWidth(width: number): TableColumn {
    return new TableColumn(
      this.key, this.header, this.cellTemplate, width, this.align, this.formatSpec,
    );
  }

  /** 데이터 Token이 선택한 행 필드와 선택적 제안 헤더를 한 열에 결합한다. */
  withDataField(fieldKey: string, suggestedHeader?: string): TableColumn {
    return new TableColumn(
      fieldKey,
      suggestedHeader ?? this.header,
      `{{row.${fieldKey}}}`,
      this.width,
      this.align,
      this.formatSpec,
    );
  }

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
