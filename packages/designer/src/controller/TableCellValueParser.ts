import type { TableCellValue } from "@report-tool/core";

/**
 * 사용자가 입력한 문자열을 표 셀에 저장할 값으로 바꾼다.
 *
 * 숫자로만 이루어진 입력을 숫자로 저장하는 이유는, 금액 열의 오른쪽 정렬과
 * 통화 포맷이 문자열에서는 의미를 갖지 못하기 때문이다. 앞에 0이 붙은 값이나
 * 기호가 섞인 값은 사용자가 그렇게 보이길 원한 것으로 보고 문자열로 남긴다.
 */
export class TableCellValueParser {
  /** 숫자로 저장해도 사용자가 입력한 모양이 유지되는 경우만 숫자로 바꾼다. */
  parse(input: string): TableCellValue {
    const trimmed = input.trim();
    if (trimmed.length === 0) return "";
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return input;
    if (String(parsed) !== trimmed) return input;
    return parsed;
  }

  /** 저장된 셀 값을 입력기에 넣을 문자열로 되돌린다. */
  format(value: TableCellValue | undefined): string {
    if (value === undefined || value === null) return "";
    return String(value);
  }
}
