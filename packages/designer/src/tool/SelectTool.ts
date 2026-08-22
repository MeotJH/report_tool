import { Frame, type Element } from "@report-tool/core";
import { CompositeCommand } from "../command/CompositeCommand.js";
import type { EditorCommand } from "../command/EditorCommand.js";
import { TransformElementCommand } from "../command/TransformElementCommand.js";
import type { EditorController, PointerModifiers } from "../controller/EditorController.js";
import { FrameBounds } from "../controller/FrameBounds.js";
import { ResizeHandleSet, type ResizeHandle } from "../controller/ResizeHandleSet.js";
import { SnapGuide, SnapTargets } from "../controller/SnapGuide.js";
import { EditorTool } from "./EditorTool.js";

/**
 * 포인터를 누른 지점이 결정한 드래그의 의미를 각각 독립된 전략으로 처리한다.
 *
 * 이동·크기변경·영역선택을 한 메서드의 조건문으로 처리하면 상태 변수가 뒤섞여
 * 어떤 조합에서 무엇이 일어나는지 읽을 수 없게 된다.
 */
abstract class SelectGesture {
  /** 드래그 중 화면 미리보기를 갱신한다. */
  abstract move(xMm: number, yMm: number, controller: EditorController): void;

  /** 드래그 결과를 하나의 취소 가능한 작업으로 확정한다. */
  abstract commit(controller: EditorController): void;
}

/** 누르고 바로 뗀 클릭이 아무 것도 바꾸지 않게 하는 기본 전략이다. */
class NoGesture extends SelectGesture {
  /** 클릭만으로는 갱신할 미리보기가 없다. */
  move(): void {}

  /** 클릭만으로는 확정할 변경이 없다. */
  commit(): void {}
}

/** 선택된 요소 전체를 같은 이동량으로 옮기고 그룹 경계로 스냅한다. */
class MoveGesture extends SelectGesture {
  private readonly snapGuide = new SnapGuide();
  private readonly beforeFrames: ReadonlyMap<string, Frame>;
  private movedFrames: ReadonlyMap<string, Frame>;

  /** 이동 시작 시점의 원본 배치를 캡처해 취소와 스냅 계산의 기준으로 삼는다. */
  constructor(
    private readonly elements: readonly Element[],
    private readonly startXMm: number,
    private readonly startYMm: number,
  ) {
    super();
    this.beforeFrames = new Map(elements.map((element) => [element.id, element.frame]));
    this.movedFrames = this.beforeFrames;
  }

  /** 그룹 경계를 기준으로 한 번만 스냅해 요소 사이 간격을 유지한다. */
  move(xMm: number, yMm: number, controller: EditorController): void {
    const rawDeltaX = xMm - this.startXMm;
    const rawDeltaY = yMm - this.startYMm;
    const bounds = FrameBounds.of([...this.beforeFrames.values()]);
    const targets = SnapTargets.from(
      controller.getFramesExcept(this.elements.map((element) => element.id)),
      controller.getTemplate().page,
    );
    const snapped = this.snapGuide.snapMove(
      bounds.moveBy(rawDeltaX, rawDeltaY),
      targets,
    );
    const deltaX = snapped.frame.x - bounds.x;
    const deltaY = snapped.frame.y - bounds.y;
    this.movedFrames = new Map(
      [...this.beforeFrames].map(([id, frame]) => [id, frame.moveBy(deltaX, deltaY)]),
    );
    controller.getPreview().setFrames(this.movedFrames);
    controller.getPreview().setLines(snapped.lines);
    controller.notifyPreviewChange();
  }

  /** 실제로 움직인 요소만 한 번의 Undo 단위로 기록한다. */
  commit(controller: EditorController): void {
    const commands = [...this.beforeFrames]
      .filter(([id, before]) => !before.equals(this.movedFrames.get(id) ?? before))
      .map(([id, before]) => new TransformElementCommand(
        id, before, this.movedFrames.get(id)!,
      ));
    controller.clearPreview();
    if (commands.length === 0) return;
    controller.execute(new CompositeCommand(commands));
  }
}

/** 잡은 핸들이 움직이는 변만 바꿔 요소 크기를 조정한다. */
class ResizeGesture extends SelectGesture {
  private readonly snapGuide = new SnapGuide();
  private afterFrame: Frame;

  /** 크기 변경 대상과 잡은 핸들을 드래그 수명 동안 고정한다. */
  constructor(
    private readonly element: Element,
    private readonly handle: ResizeHandle,
    private readonly startXMm: number,
    private readonly startYMm: number,
  ) {
    super();
    this.afterFrame = element.frame;
  }

  /** 손이 잡은 변만 스냅해 반대쪽 변이 끌려가지 않게 한다. */
  move(xMm: number, yMm: number, controller: EditorController): void {
    const resized = this.handle.resize(
      this.element.frame, xMm - this.startXMm, yMm - this.startYMm,
    );
    const targets = SnapTargets.from(
      controller.getFramesExcept([this.element.id]),
      controller.getTemplate().page,
    );
    const snapped = this.snapGuide.snapEdges(resized, this.handle.edges, targets);
    this.afterFrame = snapped.frame;
    controller.getPreview().setFrames(new Map([[this.element.id, this.afterFrame]]));
    controller.getPreview().setLines(snapped.lines);
    controller.notifyPreviewChange();
  }

  /** 크기가 실제로 바뀐 경우만 하나의 변형 명령으로 기록한다. */
  commit(controller: EditorController): void {
    controller.clearPreview();
    if (this.element.frame.equals(this.afterFrame)) return;
    controller.execute(new TransformElementCommand(
      this.element.id, this.element.frame, this.afterFrame,
    ));
  }
}

/** 빈 곳 드래그가 범위 안에 완전히 들어온 요소를 선택하게 한다. */
class MarqueeGesture extends SelectGesture {
  private area: Frame;

  /** 선택 범위의 시작점을 보존해 어느 방향 드래그든 처리하게 한다. */
  constructor(
    private readonly startXMm: number,
    private readonly startYMm: number,
    private readonly additive: boolean,
    private readonly previousIds: readonly string[],
  ) {
    super();
    this.area = new Frame(startXMm, startYMm, 0, 0);
  }

  /** 현재 포인터까지의 선택 범위를 화면에 보여준다. */
  move(xMm: number, yMm: number, controller: EditorController): void {
    this.area = new Frame(
      Math.min(this.startXMm, xMm),
      Math.min(this.startYMm, yMm),
      Math.abs(xMm - this.startXMm),
      Math.abs(yMm - this.startYMm),
    );
    controller.getPreview().setMarqueeFrame(this.area);
    controller.notifyPreviewChange();
  }

  /** 범위에 들어온 요소를 기존 선택에 더하거나 새 선택으로 교체한다. */
  commit(controller: EditorController): void {
    const foundIds = controller.findElementsWithin(this.area)
      .map((element) => element.id);
    controller.clearPreview();
    if (this.area.width < 1 && this.area.height < 1) return;
    const ids = this.additive
      ? [...new Set([...this.previousIds, ...foundIds])]
      : foundIds;
    controller.selectElements(ids);
  }
}

/** 클릭은 선택으로, 드래그는 누른 지점에 맞는 편집 작업으로 해석한다. */
export class SelectTool extends EditorTool {
  /** 확대율과 무관하게 핸들을 잡을 수 있는 판정 반경을 mm로 고정한다. */
  private static readonly HANDLE_TOLERANCE_MM = 2;
  public readonly kind = "select" as const;
  private readonly handles = new ResizeHandleSet();
  private gesture: SelectGesture = new NoGesture();

  /** 누른 지점이 핸들·요소·빈 곳 중 무엇인지 보고 드래그 의미를 결정한다. */
  onPointerDown(
    xMm: number,
    yMm: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): void {
    const resize = this.findResizeGesture(xMm, yMm, controller);
    if (resize !== undefined) {
      this.gesture = resize;
      return;
    }
    const element = controller.findElementAt(xMm, yMm);
    if (element === undefined) {
      this.gesture = new MarqueeGesture(
        xMm, yMm, modifiers.additive === true,
        controller.getSelectionModel().getSelectedIds(),
      );
      if (modifiers.additive !== true) controller.selectElement(null);
      return;
    }
    this.gesture = this.startElementGesture(element, xMm, yMm, controller, modifiers);
  }

  /** 진행 중인 드래그 전략에 포인터 이동을 위임한다. */
  onPointerMove(xMm: number, yMm: number, controller: EditorController): void {
    this.gesture.move(xMm, yMm, controller);
  }

  /** 드래그 결과를 확정하고 다음 입력을 위해 전략을 초기화한다. */
  onPointerUp(_xMm: number, _yMm: number, controller: EditorController): void {
    this.gesture.commit(controller);
    this.gesture = new NoGesture();
  }

  /** 단일 선택일 때만 크기 변경 핸들을 잡을 수 있게 한다. */
  private findResizeGesture(
    xMm: number,
    yMm: number,
    controller: EditorController,
  ): ResizeGesture | undefined {
    const selected = controller.getSingleSelectedElement();
    if (selected === undefined || selected.locked) return undefined;
    const handle = this.handles.findAt(
      selected.frame, xMm, yMm, SelectTool.HANDLE_TOLERANCE_MM,
    );
    if (handle === undefined) return undefined;
    return new ResizeGesture(selected, handle, xMm, yMm);
  }

  /** 클릭한 요소를 선택 상태로 만든 뒤 이동 대상 집합을 확정한다. */
  private startElementGesture(
    element: Element,
    xMm: number,
    yMm: number,
    controller: EditorController,
    modifiers: PointerModifiers,
  ): SelectGesture {
    if (modifiers.additive === true) {
      controller.selectElement(element.id, true);
      return new NoGesture();
    }
    if (!controller.getSelectionModel().isSelected(element.id)) {
      controller.selectElement(element.id);
    }
    const movable = controller.getSelectedElements()
      .filter((candidate) => !candidate.locked);
    if (movable.length === 0) return new NoGesture();
    return new MoveGesture(movable, xMm, yMm);
  }
}
