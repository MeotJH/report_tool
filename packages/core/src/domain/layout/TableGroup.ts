import type { Element } from "../element/Element.js";
import type { TableElement } from "../element/TableElement.js";
import { Frame } from "../value/Frame.js";

/**
 * 표 하나와 그 표에 딸린 요소들을 한 덩어리로 다룬다.
 *
 * 표에 딸린 요소는 두 종류이고, 표가 쪽을 넘을 때 정반대로 움직인다.
 *
 * - **제목(`caption`)**: 표 위의 제목·기간. 표가 이어지는 쪽마다 같은 모양으로
 *   다시 나온다. `repeated`(모든 쪽에 반복)로는 안 된다 — 그걸 켜면 표가 없는
 *   표지에도 제목이 나온다.
 * - **흐름(`flow`)**: 표 아래의 다음 구역. 표가 실제로 쓴 높이만큼 밀려 내려간다.
 *   표의 `frame`은 표가 쓸 수 있는 자리일 뿐 실제로 쓴 높이가 아니고, 실제로
 *   쓴 높이는 발행할 데이터가 정하기 때문이다.
 *
 * 이 계산이 `DocumentLayout` 안에 흩어져 있으면 "제목 높이"와 "표 시작 위치"와
 * "다음 구역이 밀리는 거리"가 각자 계산되어 반드시 어긋난다.
 */
export class TableGroup {
  /** 표와 함께 움직일 요소를 방식별로 나눠 들고 있는다. */
  private constructor(
    public readonly table: TableElement,
    public readonly captions: readonly Element[],
    public readonly flowed: readonly Element[],
  ) {}

  /** 이 표를 따라가겠다고 선언한 요소만 모아 방식별로 나눈다. */
  static of(table: TableElement, candidates: readonly Element[]): TableGroup {
    const following = candidates.filter(
      (element) => element.follows?.elementId === table.id,
    );
    return new TableGroup(
      table,
      following.filter((element) => element.follows?.mode === "caption"),
      following.filter((element) => element.follows?.mode === "flow"),
    );
  }

  /**
   * 덩어리의 맨 위 좌표(mm)다. 제목이 표보다 위에 있으면 제목이 기준이 된다.
   *
   * 흐름 요소는 기준을 바꾸지 못한다. 그것들은 표가 끝난 뒤에야 자리가 정해지고,
   * 표가 몇 줄로 이어질지는 쪽마다 다르기 때문이다.
   */
  topMm(): number {
    return this.captions.reduce(
      (top, element) => Math.min(top, element.frame.y),
      this.table.frame.y,
    );
  }

  /** 덩어리 맨 위부터 표가 시작하기까지 제목이 차지하는 높이(mm)다. */
  headHeightMm(): number {
    return this.table.frame.y - this.topMm();
  }

  /** 덩어리 맨 위를 주어진 자리로 옮겼을 때 제목들의 새 자리를 만든다. */
  movedCaptions(toTopMm: number): readonly Element[] {
    return this.moved(this.captions, toTopMm - this.topMm());
  }

  /**
   * 표가 실제로 끝난 자리에 맞춰 다음 구역을 옮긴다.
   *
   * 사용자가 만든 간격을 그대로 지킨다. 표의 자리(`frame`) 아래 8mm에 다음
   * 제목을 놓았으면, 표가 길어지든 짧아지든 끝난 자리 아래 8mm에 놓인다.
   */
  movedFlowed(tableTopMm: number, contentHeightMm: number): readonly Element[] {
    const authoredEndMm = this.table.frame.y + this.table.frame.height;
    return this.moved(this.flowed, tableTopMm + contentHeightMm - authoredEndMm);
  }

  /** 딸린 요소가 하나도 없으면 덩어리로 다룰 이유가 없다. */
  isEmpty(): boolean {
    return this.captions.length === 0 && this.flowed.length === 0;
  }

  /** 세로로만 옮긴다. 가로 자리는 사용자가 정한 그대로 둔다. */
  private moved(elements: readonly Element[], deltaMm: number): readonly Element[] {
    return elements.map((element) => element.withFrame(new Frame(
      element.frame.x,
      element.frame.y + deltaMm,
      element.frame.width,
      element.frame.height,
    )));
  }
}
