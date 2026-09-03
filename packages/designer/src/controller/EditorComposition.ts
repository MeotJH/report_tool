import {
  DocumentLayout,
  PageOverflow,
  TableCellText,
  TableRowHeights,
  type Frame,
  type PageLayout,
  type PlacedElement,
  type StyleMeasurerFactory,
  type Template,
  type TableLayoutResult,
} from "@report-tool/core";
import type { EditorMode } from "./EditorController.js";

/**
 * 편집 화면이 **발행본과 같은 쪽·같은 자리**를 보여 주게 한다.
 *
 * 전에는 캔버스가 요소를 저장된 좌표 그대로, `pageIndex`가 같은 것만 그렸다.
 * 그래서 세 가지가 화면에서 사라졌다.
 *
 * - `flow`로 표를 따라가는 구역(미처리내역·기타사항)은 저장된 y가 297mm를 넘어
 *   쪽 밖에 있었다. 화면에 아예 나오지 않았다.
 * - 표가 넘쳐 생기는 **이어지는 쪽**이 없었다. 쪽 수는 `pageIndex` 최대값+1이라
 *   언제나 두 쪽이었다.
 * - 표를 줄여도 뒤 구역이 따라 올라오지 않았다. `follows`를 해석하는 것은
 *   `DocumentLayout`뿐인데 캔버스가 그것을 부르지 않았다.
 *
 * 배치 계산을 두 번 만들지 않는다. 발행본이 쓰는 `DocumentLayout`을 그대로 쓰고,
 * 다른 것은 **칸을 무엇으로 채우는가** 하나뿐이다 — 설계는 연결, 미리보기는 값.
 */
export class EditorComposition {
  /** 배치 결과와, 표마다 이 쪽에 그릴 줄을 함께 들고 다닌다. */
  private constructor(private readonly pages: readonly PageLayout[]) {}

  /**
   * 지금 모드에 맞는 배치를 계산한다.
   *
   * 행 높이는 두 모드 모두 내용으로 정한다. 화면에서 잰 줄과 발행본에 찍히는 줄이
   * 갈리면 "화면에서 본 것이 발행된다"가 성립하지 않는다.
   */
  static of(
    template: Template,
    data: unknown,
    mode: EditorMode,
    measurerFactory: StyleMeasurerFactory,
  ): EditorComposition {
    const design = mode === "design";
    const layout = new DocumentLayout(
      design ? TableCellText.source() : TableCellText.resolved(),
      TableRowHeights.content(measurerFactory),
      design ? PageOverflow.contentSized() : PageOverflow.paged(),
    );
    return new EditorComposition(layout.compute(template, data));
  }

  /** 오갈 수 있는 쪽 수다. 요소가 없어도 한 장은 있다. */
  pageCount(): number {
    return Math.max(1, this.pages.length);
  }

  /** 이 쪽에 그릴 것을 쌓임 순서대로 준다. */
  placementsOn(pageIndex: number): readonly PlacedElement[] {
    return this.pages[pageIndex]?.placements ?? [];
  }

  /**
   * 이 요소가 **화면에 그려진 자리**를 준다. 찾지 못하면 `undefined`다.
   *
   * 선택 테두리·호버·눌러서 고르기가 모두 이 자리를 써야 한다. 그리는 자리와
   * 잡는 자리가 다르면, 표를 따라 올라온 구역은 눈에 보이는 데서 눌러도 잡히지
   * 않고 저장된 좌표(쪽 밖)에서만 잡힌다.
   */
  frameOf(pageIndex: number, elementId: string): Frame | undefined {
    return this.placementsOn(pageIndex)
      .find((placement) => placement.element.id === elementId)?.element.frame;
  }

  /** 이 쪽에서 그 표가 그릴 줄을 준다. 표가 아니거나 없으면 `undefined`다. */
  tableResultOf(pageIndex: number, elementId: string): TableLayoutResult | undefined {
    return this.placementsOn(pageIndex)
      .find((placement) => placement.element.id === elementId)?.table ?? undefined;
  }
}
