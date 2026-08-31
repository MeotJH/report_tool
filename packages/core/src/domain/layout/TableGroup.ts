import type { Element } from "../element/Element.js";
import type { TableElement } from "../element/TableElement.js";
import { Frame } from "../value/Frame.js";

/**
 * 표 하나와 그 표를 따라다니는 요소들을 한 덩어리로 다룬다.
 *
 * 표가 쪽을 넘으면 이어지는 쪽에는 표만 남는다. 원본 리포트는 이어지는 모든 쪽에
 * `처리내역 (상세)`와 기간이 있고, 그것이 없으면 두 번째 쪽부터는 무슨 표인지
 * 알 수 없다. `repeated`(모든 쪽에 반복)로는 풀리지 않는다 — 그것을 켜면 표가
 * 없는 표지에도 제목이 나온다.
 *
 * 그래서 옮기는 단위를 **표 하나가 아니라 덩어리**로 바꾼다. 덩어리의 맨 위가
 * 이어지는 쪽의 본문 맨 위에 놓이고, 표는 캡션이 차지한 만큼 아래에서 시작한다.
 * 이 계산이 `DocumentLayout` 안에 흩어져 있으면 "캡션 높이"와 "표 시작 위치"가
 * 각자 계산되어 반드시 어긋난다.
 */
export class TableGroup {
  /** 이어지는 쪽에서 함께 갈 요소만 미리 골라 덩어리를 구성한다. */
  constructor(
    public readonly table: TableElement,
    public readonly followers: readonly Element[],
  ) {}

  /** 표를 따라다니겠다고 선언한 요소만 모아 덩어리를 만든다. */
  static of(table: TableElement, candidates: readonly Element[]): TableGroup {
    return new TableGroup(
      table,
      candidates.filter((element) => element.followsElementId === table.id),
    );
  }

  /**
   * 덩어리의 맨 위 좌표(mm)다. 캡션이 표보다 위에 있으면 캡션이 기준이 된다.
   *
   * 표 아래에 놓인 요소는 기준을 바꾸지 못한다. 표가 몇 줄로 이어질지는 쪽마다
   * 다르므로, 아래쪽에 붙는 것은 이 덩어리가 아니라 세로 흐름이 다룰 일이다.
   */
  topMm(): number {
    return this.followers.reduce(
      (top, element) => Math.min(top, element.frame.y),
      this.table.frame.y,
    );
  }

  /** 덩어리 맨 위부터 표가 시작하기까지 캡션이 차지하는 높이(mm)다. */
  headHeightMm(): number {
    return this.table.frame.y - this.topMm();
  }

  /** 덩어리 맨 위를 주어진 자리로 옮겼을 때 따라가는 요소들의 새 자리를 만든다. */
  movedFollowers(toTopMm: number): readonly Element[] {
    const deltaMm = toTopMm - this.topMm();
    return this.followers.map((element) => element.withFrame(new Frame(
      element.frame.x,
      element.frame.y + deltaMm,
      element.frame.width,
      element.frame.height,
    )));
  }
}
