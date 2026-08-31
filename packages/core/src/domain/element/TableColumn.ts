import type { FormatSpec } from "../format/FormatSpec.js";

/** 표 안에서 지원하는 셀 가로 정렬을 제한한다. */
export type TableColumnAlign = "left" | "center" | "right";

/**
 * 반복 행의 한 열이 어떤 값을 어떤 너비와 표현으로 보여줄지 보존한다.
 */
export class TableColumn {
  public readonly headerSpan: number;

  /**
   * 열 설정을 렌더링 동작 없이 직렬화 가능한 값으로 구성한다.
   *
   * 병합은 두 갈래다. `headerSpan`은 **이름 하나가 몇 열을 덮는지**이고
   * (`처리시간(시간/%)`처럼 이름은 하나인데 값은 두 칸인 표),
   * `mergesWhenEmpty`는 **값이 비면 앞 칸이 여기까지 덮는지**다
   * (`합계` 행처럼 줄마다 병합이 달라지는 표).
   *
   * 둘을 하나로 합칠 수 없다. 앞의 것은 열이 정하고, 뒤의 것은 그 행의 값이
   * 정하기 때문이다.
   */
  constructor(
    public readonly key: string,
    public readonly header: string,
    public readonly cellTemplate: string,
    public readonly width: number,
    public readonly align: TableColumnAlign,
    public readonly formatSpec: FormatSpec | null,
    headerSpan = 1,
    /**
     * 이 열의 칸이 비면 앞 칸이 여기까지 덮을지 정한다.
     *
     * 행 번호로 지정하지 않는 이유는, 데이터가 한 줄만 늘어도 엉뚱한 줄이
     * 병합되기 때문이다. 무엇이 병합을 부르는지(빈 값)를 정해 두면 행이 몇
     * 개든 옳게 동작한다.
     */
    public readonly mergesWhenEmpty = false,
  ) {
    this.headerSpan = Math.max(1, Math.trunc(headerSpan));
  }

  /** 열의 데이터 연결과 표현을 유지하면서 사용자가 입력한 헤더만 교체한다. */
  withHeader(header: string): TableColumn {
    return this.copy({ header });
  }

  /** 열의 나머지 설정을 유지하면서 mm 너비만 교체한다. */
  withWidth(width: number): TableColumn {
    return this.copy({ width });
  }

  /** 머리글 칸 하나가 덮는 열 수만 교체한다. */
  withHeaderSpan(headerSpan: number): TableColumn {
    return this.copy({ headerSpan });
  }

  /** 빈 칸일 때 앞 칸에 흡수될지만 교체한다. */
  withMergesWhenEmpty(mergesWhenEmpty: boolean): TableColumn {
    return this.copy({ mergesWhenEmpty });
  }

  /** 데이터 Token이 선택한 행 필드와 선택적 제안 헤더를 한 열에 결합한다. */
  withDataField(fieldKey: string, suggestedHeader?: string): TableColumn {
    return this.copy({
      key: fieldKey,
      header: suggestedHeader ?? this.header,
      cellTemplate: `{{row.${fieldKey}}}`,
    });
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
      headerSpan: this.headerSpan,
      mergesWhenEmpty: this.mergesWhenEmpty,
    };
  }

  /** 모든 변경 메서드가 같은 복사 규칙을 공유해 설정을 흘리지 않게 한다. */
  private copy(changes: Readonly<{
    key?: string;
    header?: string;
    cellTemplate?: string;
    width?: number;
    headerSpan?: number;
    mergesWhenEmpty?: boolean;
  }>): TableColumn {
    return new TableColumn(
      changes.key ?? this.key,
      changes.header ?? this.header,
      changes.cellTemplate ?? this.cellTemplate,
      changes.width ?? this.width,
      this.align,
      this.formatSpec,
      changes.headerSpan ?? this.headerSpan,
      changes.mergesWhenEmpty ?? this.mergesWhenEmpty,
    );
  }
}
