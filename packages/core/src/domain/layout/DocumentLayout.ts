import type { Element } from "../element/Element.js";
import { TableElement } from "../element/TableElement.js";
import { TextElement } from "../element/TextElement.js";
import type { Template } from "../template/Template.js";
import { Frame } from "../value/Frame.js";
import type { PageSpec } from "../value/PageSpec.js";
import { PageNumbering } from "./PageNumbering.js";
import { TableCellText } from "./TableCellText.js";
import { TableLayout, type TableLayoutResult } from "./TableLayout.js";
import { TableRowHeights } from "./TableRowHeights.js";

/** 한 쪽에서 실제로 그려질 요소와, 표라면 그 쪽에 담길 줄을 함께 담는다. */
export interface PlacedElement {
  /** 이 쪽에 그릴 자리까지 반영된 요소다. 이어지는 표는 자리가 바뀐다. */
  readonly element: Element;
  /** 표라면 이 쪽에 그릴 줄이고, 표가 아니면 `null`이다. */
  readonly table: TableLayoutResult | null;
}

/** 한 쪽에 그릴 것을 쌓임 순서대로 담는다. */
export interface PageLayout {
  /** 0부터 세는 쪽 번호다. */
  readonly index: number;
  /** z 순서로 정렬된, 이 쪽에 그릴 것들이다. */
  readonly placements: readonly PlacedElement[];
}

/** 이어 그려야 할 표와 다음에 그릴 행 번호를 함께 들고 다닌다. */
interface PendingTable {
  readonly element: TableElement;
  readonly nextBodyRowIndex: number;
}

/**
 * 문서 하나가 몇 쪽이 되고 각 쪽에 무엇이 그려지는지를 도메인에서 정한다.
 *
 * 요소는 mm 절대 좌표로 저장되지만, 표의 행 수는 발행할 데이터가 정한다. 그래서
 * "이 문서가 몇 쪽인가"는 저장된 값이 아니라 데이터를 받아 계산해야 하는 값이다.
 * 이 계산을 렌더러가 각자 하면 편집기가 본 쪽 수와 발행본의 쪽 수가 갈린다.
 *
 * 넘치는 줄을 버리지 않는다. 자리에 들어가지 않은 줄은 다음 쪽에서 이어 그리고,
 * 그때 열 이름 줄을 다시 그린다 — 두 번째 쪽부터 어느 칸이 무엇인지 알 수 없으면
 * 표가 아니라 숫자 나열이 된다.
 */
export class DocumentLayout {
  private readonly tableLayout: TableLayout;

  /** 셀 표현과 행 높이 방식을 표 계산과 그대로 공유한다. */
  constructor(
    cellText: TableCellText = TableCellText.resolved(),
    rowHeights: TableRowHeights = TableRowHeights.fixed(),
  ) {
    this.tableLayout = new TableLayout(cellText, rowHeights);
  }

  /**
   * 템플릿과 데이터를 쪽 목록으로 바꾼다. 최소 한 쪽은 항상 나온다.
   *
   * 사용자가 만든 쪽(요소의 `pageIndex`)을 차례로 내보내되, 어떤 쪽의 표가 넘치면
   * **그 쪽 바로 뒤에** 이어지는 쪽을 넣는다. 표가 이어지는 도중에 다음 저작 쪽이
   * 끼어들면 읽는 순서가 뒤집힌다.
   */
  compute(template: Template, data: unknown): readonly PageLayout[] {
    const pages: PageLayout[] = [];
    for (let authored = 0; authored < template.pageCount(); authored += 1) {
      const elements = this.byStackOrder(this.elementsOn(template, authored));
      const placements = elements.map((element) => this.placeAtOwnFrame(element, data));
      pages.push({ index: pages.length, placements });
      let pending = this.pendingFrom(placements);
      while (pending.length > 0) {
        const page = this.continuationPage(pages.length, pending, template.page, data);
        pages.push(page.layout);
        pending = page.pending;
      }
    }
    return this.withRepeatedElements(pages, template, data);
  }

  /** 사용자가 그 쪽에 놓은 요소만 고른다. 반복 요소는 따로 얹는다. */
  private elementsOn(template: Template, pageIndex: number): readonly Element[] {
    return template.getElements().filter(
      (element) => !element.repeated && element.pageIndex === pageIndex,
    );
  }

  /**
   * 머리글·바닥글처럼 모든 쪽에 나오는 것을 얹고, 쪽 번호를 그때 채운다.
   *
   * 쪽 번호는 모든 쪽이 정해진 뒤에야 알 수 있다. 표가 몇 줄로 흐르는지가 쪽 수를
   * 정하기 때문이다. 그래서 배치를 다 끝낸 다음에 한 번 더 훑는다.
   *
   * 반복 요소를 맨 뒤에 얹는 이유는 머리글이 본문에 가려지지 않게 하기 위해서다.
   */
  private withRepeatedElements(
    pages: readonly PageLayout[],
    template: Template,
    data: unknown,
  ): readonly PageLayout[] {
    const repeated = this.byStackOrder(
      template.getElements().filter((element) => element.repeated),
    );
    return pages.map((page) => {
      const numbering = new PageNumbering(page.index + 1, pages.length);
      return {
        index: page.index,
        placements: [
          ...page.placements.map((placement) => this.numbered(placement, numbering)),
          ...repeated.map((element) => this.numbered(
            this.placeAtOwnFrame(element, data), numbering,
          )),
        ],
      };
    });
  }

  /** 문구 안의 쪽 번호 자리를 이 쪽의 번호로 바꾼 요소로 교체한다. */
  private numbered(placement: PlacedElement, numbering: PageNumbering): PlacedElement {
    const element = placement.element;
    if (!(element instanceof TextElement)) return placement;
    const value = numbering.apply(element.content.value);
    if (value === element.content.value) return placement;
    return {
      element: element.withContent({ kind: element.content.kind, value }),
      table: placement.table,
    };
  }

  /** 그리는 순서가 저장 순서가 아니라 쌓임 순서를 따르게 한다. */
  private byStackOrder(elements: readonly Element[]): readonly Element[] {
    return [...elements].sort((first, second) => first.z - second.z);
  }

  /** 첫 쪽에서는 모든 요소가 자기 자리에 그대로 놓인다. */
  private placeAtOwnFrame(element: Element, data: unknown): PlacedElement {
    if (!(element instanceof TableElement)) return { element, table: null };
    return { element, table: this.tableLayout.compute(element, data) };
  }

  /** 이 쪽에서 다 그리지 못한 표만 다음 쪽으로 넘긴다. */
  private pendingFrom(placements: readonly PlacedElement[]): readonly PendingTable[] {
    return placements.flatMap((placement) => {
      const next = placement.table?.nextBodyRowIndex;
      if (next === undefined || next === null) return [];
      return [{ element: placement.element as TableElement, nextBodyRowIndex: next }];
    });
  }

  /**
   * 이어지는 표만 담은 쪽을 만든다.
   *
   * 이어지는 표는 본문 영역 맨 위부터 차례로 쌓는다. 가로 위치와 너비는 원래
   * 표의 것을 그대로 쓴다 — 같은 표가 쪽마다 다른 폭으로 보이면 다른 표로 읽힌다.
   */
  private continuationPage(
    index: number,
    pending: readonly PendingTable[],
    page: PageSpec,
    data: unknown,
  ): Readonly<{ layout: PageLayout; pending: readonly PendingTable[] }> {
    const content = page.contentFrame();
    const placements: PlacedElement[] = [];
    const carried: PendingTable[] = [];
    let topMm = content.y;
    for (const item of pending) {
      const availableMm = content.y + content.height - topMm;
      if (availableMm <= 0) {
        carried.push(item);
        continue;
      }
      const placed = this.continue(item, topMm, availableMm, data);
      placements.push(placed.placement);
      topMm += placed.consumedMm;
      if (placed.next !== null) {
        carried.push({ element: item.element, nextBodyRowIndex: placed.next });
      }
    }
    return { layout: { index, placements }, pending: carried };
  }

  /** 표 한 개의 다음 조각을 주어진 자리에 놓는다. */
  private continue(
    item: PendingTable,
    topMm: number,
    availableMm: number,
    data: unknown,
  ): Readonly<{ placement: PlacedElement; consumedMm: number; next: number | null }> {
    const frame = new Frame(
      item.element.frame.x, topMm, item.element.frame.width, availableMm,
    );
    const element = item.element.withFrame(frame) as TableElement;
    const table = this.tableLayout.compute(element, data, {
      startBodyRowIndex: item.nextBodyRowIndex,
      forceFirstBodyRow: true,
    });
    return {
      placement: { element, table },
      consumedMm: this.consumedHeight(table),
      next: table.nextBodyRowIndex,
    };
  }

  /** 다음 표가 어디서 시작할지 알도록 이 조각이 실제로 쓴 높이를 잰다. */
  private consumedHeight(table: TableLayoutResult): number {
    const last = table.rows[table.rows.length - 1];
    return last === undefined ? 0 : last.topMm + last.heightMm;
  }
}
