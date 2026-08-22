import type { Element } from "@report-tool/core";
import { ElementCloner } from "./ElementCloner.js";

/**
 * 복사한 요소를 편집기 안에서만 보관해 호스트 페이지 클립보드와 섞이지 않게 한다.
 *
 * 급여 데이터가 연결된 요소를 OS 클립보드에 올리면 편집기 밖으로 흘러나갈 수 있다.
 * 라이브러리가 데이터를 직접 다루지 않는다는 원칙에 따라 메모리에만 둔다.
 */
export class ElementClipboard {
  private readonly cloner = new ElementCloner();
  private copied: readonly Element[] = [];
  private pasteCount = 0;

  /** 이후 원본이 바뀌거나 삭제되어도 붙여넣기가 가능하게 사본을 보관한다. */
  copy(elements: readonly Element[]): void {
    this.copied = this.cloner.cloneAll(elements, 0);
    this.pasteCount = 0;
  }

  /** 툴바와 단축키가 붙여넣기 가능 여부를 미리 판단하게 한다. */
  isEmpty(): boolean {
    return this.copied.length === 0;
  }

  /**
   * 붙여넣을 새 요소를 만든다.
   *
   * 연속 붙여넣기가 같은 자리에 겹쳐 쌓이면 몇 개가 생겼는지 알 수 없으므로
   * 호출 횟수에 비례해 조금씩 밀어 놓는다.
   */
  paste(): readonly Element[] {
    if (this.copied.length === 0) return [];
    this.pasteCount += 1;
    return this.cloner.cloneAll(this.copied, ElementClipboard.OFFSET_MM * this.pasteCount);
  }

  /** 붙여넣을 때마다 어긋나는 간격을 mm로 고정한다. */
  private static readonly OFFSET_MM = 4;
}
