import {
  TableColumn,
  type FormatSpec,
  type TableColumnAlign,
  type VariableValueType,
} from "@report-tool/core";
import type { PaletteEntry } from "./PaletteEntry.js";

/** 배열 자식 필드 하나가 표 열이 될 때 필요한 표현 규칙이다. */
interface ColumnPresentation {
  readonly align: TableColumnAlign;
  readonly formatSpec: FormatSpec | null;
}

/**
 * 배열 필드의 자식 스키마를 표 열 구성으로 바꾼다.
 *
 * 사용자가 배열을 놓았을 때 빈 표가 아니라 곧바로 쓸 수 있는 열이 생겨야 한다.
 * 스키마의 label과 type이 이미 헤더와 정렬·포맷을 결정할 정보를 담고 있으므로
 * 그것을 그대로 사용하고, 사용자가 바꾸면 그 값이 우선한다.
 */
export class TableColumnPlanner {
  /** 이 제품의 금액은 원화이므로 통화 열의 기본 통화를 원으로 둔다. */
  private static readonly DEFAULT_CURRENCY = "KRW" as const;

  /** 날짜 열이 표에서 한 줄을 넘지 않는 기본 표기다. */
  private static readonly DEFAULT_DATE_PATTERN = "YYYY-MM-DD";

  /**
   * 배열 자식 중 열이 될 수 있는 필드만 골라 너비를 나눠 가진 열 목록을 만든다.
   *
   * 중첩 배열을 제외하는 이유는 표 안의 표를 지원하지 않기 때문이다.
   */
  fromArrayChildren(
    children: readonly PaletteEntry[],
    totalWidthMm: number,
  ): readonly TableColumn[] {
    const columns = children.filter((child) => child.type !== "array");
    if (columns.length === 0) {
      throw new Error("표로 만들 수 있는 자식 필드가 없다");
    }
    const width = totalWidthMm / columns.length;
    return columns.map((child) => {
      const key = this.rowKeyOf(child);
      const presentation = this.presentationFor(child.type);
      return new TableColumn(
        key,
        child.label,
        `{{row.${key}}}`,
        width,
        presentation.align,
        presentation.formatSpec,
      );
    });
  }

  /** 열 표현식은 배열 경로가 아니라 행 안의 키를 참조해야 한다. */
  private rowKeyOf(child: PaletteEntry): string {
    const separator = child.path.lastIndexOf(".");
    return separator === -1 ? child.path : child.path.slice(separator + 1);
  }

  /** 기존 열 너비 합계를 유지한 채 열 구성만 새 스키마로 교체하게 한다. */
  fromArrayChildrenKeepingWidth(
    children: readonly PaletteEntry[],
    existingWidths: readonly number[],
  ): readonly TableColumn[] {
    const total = existingWidths.reduce((sum, width) => sum + width, 0);
    return this.fromArrayChildren(children, total);
  }

  /** 숫자와 금액은 오른쪽에 붙어야 자릿수를 비교할 수 있다. */
  private presentationFor(type: VariableValueType): ColumnPresentation {
    const presentations: Partial<Record<VariableValueType, ColumnPresentation>> = {
      currency: {
        align: "right",
        formatSpec: {
          kind: "currency",
          currency: TableColumnPlanner.DEFAULT_CURRENCY,
        },
      },
      number: { align: "right", formatSpec: { kind: "number", thousands: true } },
      date: {
        align: "left",
        formatSpec: {
          kind: "date",
          pattern: TableColumnPlanner.DEFAULT_DATE_PATTERN,
        },
      },
    };
    return presentations[type] ?? { align: "left", formatSpec: null };
  }
}
