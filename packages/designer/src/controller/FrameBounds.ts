import { Frame } from "@report-tool/core";

/**
 * 여러 영역을 하나의 사각형으로 묶어 다중 선택을 단일 대상처럼 다루게 한다.
 *
 * 다중 이동·정렬·스냅이 각자 최소·최대를 다시 계산하면 경계 조건이 어긋나므로
 * 묶는 규칙을 이 클래스에만 둔다.
 */
export class FrameBounds {
  /** 전달한 모든 영역을 감싸는 가장 작은 영역을 만든다. */
  static of(frames: readonly Frame[]): Frame {
    if (frames.length === 0) {
      throw new Error("빈 목록의 경계 영역은 계산할 수 없다");
    }
    const left = Math.min(...frames.map((frame) => frame.x));
    const top = Math.min(...frames.map((frame) => frame.y));
    const right = Math.max(...frames.map((frame) => frame.x + frame.width));
    const bottom = Math.max(...frames.map((frame) => frame.y + frame.height));
    return new Frame(left, top, right - left, bottom - top);
  }
}
