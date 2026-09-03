import { TableCellResolver } from "../element/TableCellResolver.js";
import type { TableColumn } from "../element/TableColumn.js";
import { TemplateExpression } from "../element/TemplateExpression.js";

/**
 * 표의 한 줄을 어떤 문자열로 채울지 정하는 방식을 다형적으로 고른다.
 *
 * 같은 표라도 편집 중과 발행본에서 보여야 하는 것이 다르다. 편집 중에는 사용자가
 * 셀에 써 넣은 `{{baseSalary}}`가 그대로 보여야 하고(그래야 캔버스와 셀 입력기가
 * 같다), 발행본에는 그 자리에 금액이 찍혀야 한다. 이 차이를 렌더러마다 `if`로
 * 나누면 반드시 갈라지므로, 다른 것은 이 전략 하나뿐이게 만든다.
 */
export abstract class TableCellText {
  /** 열에서 값을 꺼내는 규칙은 어느 방식이든 하나만 쓴다. */
  protected readonly resolver = new TableCellResolver();

  /** 발행본과 미리보기가 쓰는, 문서 데이터까지 채우는 방식을 만든다. */
  static resolved(): TableCellText {
    return new ResolvedTableCellText();
  }

  /** 설계 화면이 쓰는, 사용자가 써 넣은 표현식을 보존하는 방식을 만든다. */
  static source(): TableCellText {
    return new SourceTableCellText();
  }

  /** 한 행을 열 순서대로 해석해 실제로 그려질 문자열을 만든다. */
  abstract cellsFor(
    columns: readonly TableColumn[],
    row: unknown,
    data: unknown,
  ): readonly string[];

  /**
   * 표의 본문 전체를 만든다. 몇 줄이 될지도 방식이 정한다.
   *
   * `deferred`는 행 수가 발행 데이터로 정해지는 표(데이터 표)인지다. 그 답에 따라
   * 설계 화면이 보여 줄 것이 달라진다.
   */
  abstract bodyCells(
    columns: readonly TableColumn[],
    rows: readonly unknown[],
    data: unknown,
    deferred: boolean,
  ): readonly (readonly string[])[];

  /** 열이 어떤 데이터에 연결됐는지를 한 줄로 보여 준다. */
  protected connectionRow(columns: readonly TableColumn[]): readonly string[] {
    return columns.map((column) => (
      TemplateExpression.pathsIn(column.cellTemplate)[0] ?? column.cellTemplate
    ));
  }
}

/** 발행과 미리보기가 실제로 찍히는 값을 그대로 보게 한다. */
class ResolvedTableCellText extends TableCellText {
  /** 열 표현식과 문서 데이터를 모두 적용한 최종 문자열을 만든다. */
  cellsFor(
    columns: readonly TableColumn[],
    row: unknown,
    data: unknown,
  ): readonly string[] {
    return this.resolver.resolveRow(columns, row, data);
  }

  /** 발행본은 데이터가 없으면 본문이 없는 표로 나간다. 없는 줄을 지어내지 않는다. */
  bodyCells(
    columns: readonly TableColumn[],
    rows: readonly unknown[],
    data: unknown,
    _deferred: boolean,
  ): readonly (readonly string[])[] {
    return rows.map((row) => this.cellsFor(columns, row, data));
  }
}

/** 설계 화면이 "무엇이 연결됐는가"를 읽을 수 있게 한다. */
class SourceTableCellText extends TableCellText {
  /** 행에서 꺼내기만 하고 문서 데이터는 채우지 않은 값을 만든다. */
  cellsFor(
    columns: readonly TableColumn[],
    row: unknown,
    _data: unknown,
  ): readonly string[] {
    return this.resolver.resolveRowSource(columns, row);
  }

  /**
   * 데이터 표는 값 대신 **무엇에 연결됐는지**를 칸마다 한 줄로 보여 준다.
   *
   * 값을 보여 주면 두 가지가 틀어진다. 첫째, 고칠 수 없는 값이 고칠 수 있는 것처럼
   * 보인다 — 실제로 담당자가 그 칸을 눌러 보고 아무 일도 일어나지 않아 막혔다.
   * 둘째, 호스트가 샘플 데이터를 줬는지에 따라 같은 양식이 전혀 다르게 보인다.
   *
   * **한 줄만 보여 주는 이유도 두 번째와 같다.** 전에는 연결 줄을 데이터 행 수만큼
   * 복사했다. 그래서 같은 양식이 7월 데이터(23건)에서는 스물세 줄, 8월 데이터
   * (7건)에서는 일곱 줄로 보였다 — 양식은 한 글자도 바뀌지 않았는데도. 같은 내용을
   * 스물세 번 반복해도 첫 줄보다 더 알려 주는 것이 없다.
   *
   * 양식이 정하는 것은 "한 줄이 어떻게 생겼는가"이고, 그 줄이 몇 번 반복되는지는
   * 발행 데이터가 정한다. 그러므로 설계 화면은 반복 단위 한 줄을 보여 준다. 실제
   * 행 수와 쪽 나눔은 미리보기가 답한다.
   *
   * 정적 표는 값이 곧 양식이므로 써 넣은 것을 그대로, 줄 수까지 보여 준다.
   */
  bodyCells(
    columns: readonly TableColumn[],
    rows: readonly unknown[],
    _data: unknown,
    deferred: boolean,
  ): readonly (readonly string[])[] {
    if (!deferred) return rows.map((row) => this.resolver.resolveRowSource(columns, row));
    return [this.connectionRow(columns)];
  }
}
