import { TableCellResolver } from "../element/TableCellResolver.js";
import type { TableColumn } from "../element/TableColumn.js";

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
   * 행이 하나도 없을 때 대신 보여 줄 줄을 만든다. 없으면 `null`이다.
   *
   * 발행본에 없는 줄을 만들어 내면 담당자가 본 표와 서명자가 받은 표가 달라진다.
   * 그래서 자리표시자는 편집 화면만 만든다.
   */
  abstract placeholderCells(columns: readonly TableColumn[]): readonly string[] | null;
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

  /** 발행본은 데이터가 없으면 본문이 없는 표로 나가야 한다. */
  placeholderCells(_columns: readonly TableColumn[]): readonly string[] | null {
    return null;
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

  /** 아직 데이터가 없어도 표의 형태를 알 수 있게 열 이름을 자리표시자로 보여 준다. */
  placeholderCells(columns: readonly TableColumn[]): readonly string[] | null {
    return columns.map((column) => `⟨${column.key}⟩`);
  }
}
