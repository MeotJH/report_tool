import type { TableColumn } from "./TableColumn.js";
import { TemplateExpression } from "./TemplateExpression.js";

/**
 * 표 한 칸의 최종 문자열을 캔버스·PDF·폰트 수집이 같은 규칙으로 얻게 한다.
 *
 * 셀 값은 두 단계로 정해진다. 먼저 열의 표현식이 행에서 값을 꺼내고, 그 값이 다시
 * 표현식이면 문서 데이터로 채운다. 두 번째 단계가 있어야 "항목 이름은 템플릿에
 * 고정하고 금액만 사람마다 다르게" 하는 급여명세서 표가 만들어진다.
 *
 * 이 계산을 세 곳이 각자 하면 반드시 어긋난다. 실제로 폰트 서브셋이 수집한 글자와
 * 실제로 찍히는 글자가 달라지면 한글이 통째로 빈칸으로 발행된다.
 */
export class TableCellResolver {
  /**
   * 열과 행과 문서 데이터를 결합해 실제로 찍힐 문자열을 만든다.
   *
   * 치환은 정확히 두 번만 한다. 결과에 표현식이 또 남아 있어도 더 파고들지 않는다.
   * 데이터가 데이터를 가리키는 구조를 허용하면 순환을 막을 방법이 없고,
   * 무엇이 찍힐지 사람이 읽어서 예측할 수도 없어진다.
   */
  resolve(column: TableColumn, row: unknown, data: unknown): string {
    const cell = TemplateExpression.render(column.cellTemplate, { row });
    return TemplateExpression.render(cell, data);
  }

  /** 한 행 전체를 열 순서대로 해석해 호출부가 열을 다시 순회하지 않게 한다. */
  resolveRow(
    columns: readonly TableColumn[],
    row: unknown,
    data: unknown,
  ): readonly string[] {
    return columns.map((column) => this.resolve(column, row, data));
  }

  /**
   * 행에서 꺼내기만 하고 문서 데이터는 채우지 않은 값을 준다.
   *
   * 설계 화면은 "무엇이 연결됐는가"를 보여 주는 자리다. 사용자가 셀에 써 넣은
   * `{{baseSalary}}`를 값으로 바꿔 버리면, 캔버스에는 금액이 보이는데 그 칸을
   * 더블클릭하면 표현식이 나타나 둘이 어긋난다.
   */
  resolveRowSource(
    columns: readonly TableColumn[],
    row: unknown,
  ): readonly string[] {
    return columns.map((column) => TemplateExpression.render(column.cellTemplate, { row }));
  }
}
