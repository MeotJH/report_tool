import type { Frame } from "@report-tool/core";
import type { SnapLine } from "./SnapGuide.js";

/**
 * 명령으로 확정되기 전의 화면 상태를 도메인 템플릿과 분리해 보관한다.
 *
 * 드래그 중인 좌표를 템플릿에 바로 쓰면 포인터를 움직이는 동안 Undo 이력이
 * 수백 개 쌓이거나 저장 콜백이 계속 울린다. 확정 전 상태는 화면에만 존재해야 한다.
 */
export class TransformPreview {
  private frames = new Map<string, Frame>();
  private lines: readonly SnapLine[] = [];
  private draftFrame: Frame | null = null;
  private marqueeFrame: Frame | null = null;

  /** 드래그 중인 요소가 실제 위치가 아닌 손이 끌고 있는 위치에 보이게 한다. */
  setFrames(frames: ReadonlyMap<string, Frame>): void {
    this.frames = new Map(frames);
  }

  /** 캔버스가 요소를 그릴 때 진행 중인 좌표를 우선 사용하게 한다. */
  frameFor(elementId: string): Frame | undefined {
    return this.frames.get(elementId);
  }

  /** 진행 중인 변형이 하나라도 있는지 한 번에 판단하게 한다. */
  hasFrames(): boolean {
    return this.frames.size > 0;
  }

  /** 스냅이 걸린 근거를 화면에 보여줄 기준선으로 보관한다. */
  setLines(lines: readonly SnapLine[]): void {
    this.lines = [...lines];
  }

  /** 캔버스가 현재 그려야 할 정렬 안내선을 읽게 한다. */
  getLines(): readonly SnapLine[] {
    return this.lines;
  }

  /** 새로 만들 요소의 크기를 확정 전에 점선으로 보여준다. */
  setDraftFrame(frame: Frame | null): void {
    this.draftFrame = frame;
  }

  /** 캔버스가 새 요소 생성 미리보기 영역을 읽게 한다. */
  getDraftFrame(): Frame | null {
    return this.draftFrame;
  }

  /** 빈 곳 드래그가 어떤 범위를 고르는 중인지 보여준다. */
  setMarqueeFrame(frame: Frame | null): void {
    this.marqueeFrame = frame;
  }

  /** 캔버스가 영역 선택 사각형을 읽게 한다. */
  getMarqueeFrame(): Frame | null {
    return this.marqueeFrame;
  }

  /** 드래그가 끝나면 화면에만 있던 모든 임시 상태를 함께 비운다. */
  clear(): void {
    this.frames.clear();
    this.lines = [];
    this.draftFrame = null;
    this.marqueeFrame = null;
  }
}
