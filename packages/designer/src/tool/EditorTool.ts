import { Frame, type Element } from "@report-tool/core";
import type { EditorController, PointerModifiers } from "../controller/EditorController.js";
import { SnapGuide, SnapTargets } from "../controller/SnapGuide.js";

/** 툴바가 현재 입력 전략을 안정적인 값으로 강조하도록 종류를 제한한다. */
export type ToolKind =
  | "select"
  | "text"
  | "field"
  | "box"
  | "line"
  | "table"
  | "image"
  | "signature";

/** 포인터 입력을 현재 편집 전략에 맞는 도메인 명령으로 해석한다. */
export abstract class EditorTool {
  public abstract readonly kind: ToolKind;

  /** 포인터 입력의 시작을 도구별 상태로 기록한다. */
  abstract onPointerDown(
    xMm: number,
    yMm: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): void;

  /** 포인터 이동을 선택 이동이나 새 요소 미리보기로 해석한다. */
  abstract onPointerMove(
    xMm: number,
    yMm: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): void;

  /** 포인터 입력을 하나의 취소 가능한 명령으로 확정한다. */
  abstract onPointerUp(
    xMm: number,
    yMm: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): void;
}

/** 드래그 영역으로 요소를 만드는 도구들의 중복 포인터 상태 관리를 모은다. */
export abstract class DragCreateTool extends EditorTool {
  /** 클릭만으로도 쓸 만한 요소가 생기도록 기본 크기를 mm로 정한다. */
  private static readonly CLICK_SIZE_MM = 30;
  private static readonly CLICK_HEIGHT_MM = 10;
  private readonly snapGuide = new SnapGuide();
  private start: Readonly<{ x: number; y: number }> | null = null;

  /** 드래그 시작점과 빈 미리보기 영역을 컨트롤러에 기록한다. */
  onPointerDown(xMm: number, yMm: number, controller: EditorController): void {
    this.start = { x: xMm, y: yMm };
    controller.getPreview().setDraftFrame(new Frame(xMm, yMm, 0, 0));
    controller.notifyPreviewChange();
  }

  /** 현재 포인터까지 정규화된 양수 크기 영역을 미리보기에 반영한다. */
  onPointerMove(
    xMm: number,
    yMm: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): void {
    if (this.start === null) return;
    const result = this.planFrame(this.start, xMm, yMm, controller, modifiers);
    controller.getPreview().setDraftFrame(result.frame);
    controller.getPreview().setLines(result.lines);
    controller.notifyPreviewChange();
  }

  /** 드래그와 단순 클릭 모두 하나의 요소 추가 명령으로 확정한다. */
  onPointerUp(
    xMm: number,
    yMm: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): void {
    const start = this.start;
    if (start === null) return;
    this.start = null;
    const planned = this.planFrame(start, xMm, yMm, controller, modifiers).frame;
    const frame = this.isClick(planned) ? this.clickFrame(start) : planned;
    controller.clearPreview();
    controller.placeNewElement(this.createElement(frame));
  }

  /** 도구마다 다른 도메인 요소 생성만 하위 전략이 결정하게 한다. */
  protected abstract createElement(frame: Frame): Element;

  /** 생성 도구가 충돌 가능성이 낮은 브라우저 표준 ID를 공유하게 한다. */
  protected createId(): string {
    return globalThis.crypto.randomUUID();
  }

  /** 보조키와 스냅을 반영한 생성 예정 영역을 한 곳에서 계산한다. */
  private planFrame(
    start: Readonly<{ x: number; y: number }>,
    endX: number,
    endY: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): Readonly<{ frame: Frame; lines: ReturnType<SnapGuide["snapMove"]>["lines"] }> {
    const corner = modifiers.constrain === true
      ? this.squareCorner(start, endX, endY)
      : { x: endX, y: endY };
    const frame = this.normalize(start.x, start.y, corner.x, corner.y);
    const targets = SnapTargets.from(
      controller.getFramesExcept([]),
      controller.getTemplate().page,
    );
    return this.snapGuide.snapEdges(frame, {
      left: corner.x < start.x,
      top: corner.y < start.y,
      right: corner.x >= start.x,
      bottom: corner.y >= start.y,
    }, targets);
  }

  /** Shift 드래그가 가로세로 같은 크기의 영역을 만들게 한다. */
  private squareCorner(
    start: Readonly<{ x: number; y: number }>,
    endX: number,
    endY: number,
  ): Readonly<{ x: number; y: number }> {
    const size = Math.max(Math.abs(endX - start.x), Math.abs(endY - start.y));
    return {
      x: start.x + Math.sign(endX - start.x) * size,
      y: start.y + Math.sign(endY - start.y) * size,
    };
  }

  /** 드래그 없이 누른 경우를 크기 없는 영역으로 판별한다. */
  private isClick(frame: Frame): boolean {
    return frame.width < 1 && frame.height < 1;
  }

  /** 클릭만 한 경우에도 바로 보이고 잡을 수 있는 기본 크기를 준다. */
  private clickFrame(start: Readonly<{ x: number; y: number }>): Frame {
    return new Frame(
      start.x,
      start.y,
      DragCreateTool.CLICK_SIZE_MM,
      DragCreateTool.CLICK_HEIGHT_MM,
    );
  }

  /** 어느 방향으로 드래그해도 좌상단 기준의 유효한 Frame으로 정규화한다. */
  private normalize(startX: number, startY: number, endX: number, endY: number): Frame {
    return new Frame(
      Math.min(startX, endX),
      Math.min(startY, endY),
      Math.abs(endX - startX),
      Math.abs(endY - startY),
    );
  }
}
