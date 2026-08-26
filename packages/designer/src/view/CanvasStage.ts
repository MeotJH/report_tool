import Konva from "konva";
import {
  BindingResolver,
  PageNumbering,
  TableElement,
  TemplateReferences,
  TextElement,
  type Element,
  type Frame,
} from "@report-tool/core";
import type { EditorController } from "../controller/EditorController.js";
import { FrameBounds } from "../controller/FrameBounds.js";
import { TableCellLocator } from "../controller/TableCellLocator.js";
import { TemplateIssueFinder } from "../controller/TemplateIssueFinder.js";
import { CanvasMetrics } from "./CanvasMetrics.js";
import { CanvasOverlay } from "./CanvasOverlay.js";
import { KonvaElementVisitor } from "./KonvaElementVisitor.js";

/** 캔버스가 호스트 동작을 호출할 지점을 최소한으로 제한한다. */
export interface CanvasStageCallbacks {
  readonly onFieldDrop?: (xMm: number, yMm: number) => void;
}

/**
 * Konva 수명주기와 화면 좌표 변환을 다른 편집 코드에서 격리한다.
 *
 * 확대·스크롤·호버·핸들 판정처럼 브라우저 입력에 붙는 처리를 이 클래스에 모아
 * 도구와 컨트롤러가 mm 좌표만 다루게 한다.
 */
export class CanvasStage {
  private readonly stage: Konva.Stage;
  private readonly layer = new Konva.Layer();
  private readonly bindingResolver = new BindingResolver();
  private readonly issueFinder = new TemplateIssueFinder();
  private readonly cellLocator = new TableCellLocator();
  private readonly references = new TemplateReferences();
  private readonly unsubscribe: () => void;
  private hoveredElementId: string | null = null;
  private spacePanning = false;
  private panOrigin: Readonly<{ x: number; y: number; left: number; top: number }> | null = null;
  private lastZoom: number;

  /** 브라우저 이벤트 해제 시 같은 함수 참조를 쓰기 위해 리스너를 보존한다. */
  private readonly dragOverListener = (event: DragEvent): void => this.handleDragOver(event);
  private readonly dropListener = (event: DragEvent): void => this.handleDrop(event);
  private readonly wheelListener = (event: WheelEvent): void => this.handleWheel(event);
  private readonly leaveListener = (): void => this.clearHover();

  /** 페이지 크기의 Stage를 만들고 컨트롤러 변경과 포인터 입력을 연결한다. */
  constructor(
    private readonly viewportElement: HTMLDivElement,
    private readonly stageElement: HTMLDivElement,
    private readonly controller: EditorController,
    private readonly callbacks: CanvasStageCallbacks = {},
  ) {
    this.lastZoom = this.controller.getViewport().getZoom();
    this.stage = new Konva.Stage({ container: stageElement, width: 1, height: 1 });
    this.stage.add(this.layer);
    this.bindPointerEvents();
    this.bindDomEvents();
    this.unsubscribe = this.controller.subscribe(() => this.onControllerChange());
    this.resizeStage();
    this.fitIfLargerThanViewport();
    this.render();
  }

  /** 최신 템플릿과 보조 도형을 예측 가능한 순서로 다시 그린다. */
  render(): void {
    this.layer.destroyChildren();
    const overlay = new CanvasOverlay(this.metrics().scale());
    const page = this.controller.getTemplate().page;
    this.layer.add(overlay.pageBackground(page));
    this.layer.add(overlay.marginGuide(page));
    this.addElements();
    this.addWarnings(overlay);
    this.addPathHighlight(overlay);
    this.addHover(overlay);
    this.addSelection(overlay);
    this.addGuides(overlay, page);
    this.layer.batchDraw();
  }

  /**
   * 처음 열었을 때 문서가 화면보다 크면 전체가 보이는 배율로 시작한다.
   *
   * 100%로 시작하면 A4가 대부분의 화면에 들어가지 않아 사용자는 문서의 일부만
   * 보게 되고, 스크롤해야 한다는 사실조차 알기 어렵다.
   */
  private fitIfLargerThanViewport(): void {
    if (this.stage.width() <= this.viewportElement.clientWidth
      && this.stage.height() <= this.viewportElement.clientHeight) {
      return;
    }
    this.fitToViewport();
    this.lastZoom = this.controller.getViewport().getZoom();
    this.resizeStage();
  }

  /** 화면 맞춤이 현재 보이는 영역 크기를 근거로 계산되게 한다. */
  fitToViewport(): void {
    const page = this.controller.getTemplate().page;
    const pixelsPerMm = CanvasMetrics.pixelsPerMillimeter();
    this.controller.getViewport().fit(
      page.widthMm() * pixelsPerMm,
      page.heightMm() * pixelsPerMm,
      this.viewportElement.clientWidth,
      this.viewportElement.clientHeight,
    );
    this.controller.notifyPreviewChange();
  }

  /** Space 드래그 중임을 캔버스가 알아 포인터 의미를 바꾸게 한다. */
  setSpacePanning(active: boolean): void {
    this.spacePanning = active;
    this.stageElement.toggleAttribute("data-panning", active);
  }

  /** 팔레트 드래그 중 흰 문서가 현재 드롭 대상임을 시각적으로 표시한다. */
  setFieldDragActive(active: boolean): void {
    this.stageElement.toggleAttribute("data-field-drag-active", active);
  }

  /** 호스트 화면을 떠날 때 Konva 이벤트와 캔버스 자원을 함께 정리한다. */
  destroy(): void {
    this.unsubscribe();
    this.stageElement.removeEventListener("dragover", this.dragOverListener);
    this.stageElement.removeEventListener("drop", this.dropListener);
    this.viewportElement.removeEventListener("wheel", this.wheelListener);
    this.stageElement.removeEventListener("pointerleave", this.leaveListener);
    this.stage.destroy();
  }

  /** 확대율이 바뀐 경우에만 Stage 크기를 다시 계산하고 항상 다시 그린다. */
  private onControllerChange(): void {
    const zoom = this.controller.getViewport().getZoom();
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom;
      this.resizeStage();
    }
    this.render();
  }

  /** 현재 확대율에서 페이지 전체가 들어가는 Stage 크기를 적용한다. */
  private resizeStage(): void {
    const page = this.controller.getTemplate().page;
    const metrics = this.metrics();
    this.stage.width(metrics.toPixels(page.widthMm()));
    this.stage.height(metrics.toPixels(page.heightMm()));
  }

  /** 숨김 요소를 제외하고 진행 중인 배치를 반영해 요소를 그린다. */
  private addElements(): void {
    const visitor = new KonvaElementVisitor(
      this.metrics().scale(),
      this.controller.getSampleData(),
      this.bindingResolver,
      this.controller.getMode(),
      new PageNumbering(
        this.controller.getActivePageIndex() + 1,
        this.controller.pageCount(),
      ),
    );
    for (const element of this.displayedElements()) {
      const node = element.accept(visitor);
      if (!(node instanceof Konva.Shape) && !(node instanceof Konva.Group)) {
        throw new Error("편집 요소는 Konva Shape 또는 Group이어야 한다");
      }
      if (element.id === this.controller.getElementHiddenWhileEditing()) node.visible(false);
      this.layer.add(node);
    }
  }

  /** 문제가 있는 요소를 캔버스에서 바로 알아볼 수 있게 표시한다. */
  private addWarnings(overlay: CanvasOverlay): void {
    const flagged = new Set(this.issueFinder.find(this.controller.getTemplate())
      .map((issue) => issue.elementId)
      .filter((elementId): elementId is string => elementId !== null));
    for (const element of this.displayedElements()) {
      if (!flagged.has(element.id)) continue;
      this.layer.add(overlay.warningOutline(this.displayFrame(element)));
    }
  }

  /**
   * 팔레트에서 고른 데이터를 참조하는 요소를 강조한다.
   *
   * 배열을 골랐을 때 그 자식을 쓰는 열까지 찾아주려면 하위 경로도 함께 본다.
   */
  private addPathHighlight(overlay: CanvasOverlay): void {
    const path = this.controller.getHighlightedPath();
    if (path === null) return;
    for (const element of this.displayedElements()) {
      const referenced = this.references.pathsOf(element);
      const matches = referenced.some(
        (candidate) => candidate === path || candidate.startsWith(`${path}.`),
      );
      if (!matches) continue;
      this.layer.add(overlay.highlightOutline(this.displayFrame(element)));
    }
  }

  /** 선택되지 않은 요소 위에 포인터가 있을 때만 미리 강조한다. */
  private addHover(overlay: CanvasOverlay): void {
    if (this.hoveredElementId === null) return;
    if (this.controller.getSelectionModel().isSelected(this.hoveredElementId)) return;
    const element = this.controller.getElement(this.hoveredElementId);
    if (element === undefined || element.hidden) return;
    this.layer.add(overlay.hoverOutline(this.displayFrame(element)));
  }

  /** 단일 선택은 핸들까지, 다중 선택은 전체 경계까지 함께 보여준다. */
  private addSelection(overlay: CanvasOverlay): void {
    const selected = this.controller.getSelectedElements();
    if (selected.length === 0) return;
    const frames = selected.map((element) => this.displayFrame(element));
    for (const frame of frames) this.layer.add(overlay.selectionOutline(frame));
    if (selected.length > 1) {
      this.layer.add(overlay.selectionBounds(FrameBounds.of(frames)));
      return;
    }
    if (selected[0]!.locked) return;
    for (const handle of overlay.resizeHandles(frames[0]!)) this.layer.add(handle);
  }

  /** 확정 전 상태인 안내선·영역선택·생성 미리보기를 마지막에 얹는다. */
  private addGuides(overlay: CanvasOverlay, page: Parameters<CanvasOverlay["snapLines"]>[1]): void {
    const preview = this.controller.getPreview();
    for (const line of overlay.snapLines(preview.getLines(), page)) this.layer.add(line);
    const marquee = preview.getMarqueeFrame();
    if (marquee !== null) this.layer.add(overlay.marquee(marquee));
    const draft = preview.getDraftFrame();
    if (draft !== null) this.layer.add(overlay.draft(draft));
  }

  /** 화면에 그릴 요소를 z 순서대로 정렬해 한 번만 계산한다. */
  private displayedElements(): readonly Element[] {
    return [...this.controller.elementsOnActivePage()]
      .filter((element) => !element.hidden)
      .sort((first, second) => first.z - second.z)
      .map((element) => {
        const preview = this.controller.getPreview().frameFor(element.id);
        return preview === undefined ? element : element.withFrame(preview);
      });
  }

  /** 보조 도형이 요소와 같은 진행 중 위치를 사용하게 한다. */
  private displayFrame(element: Element): Frame {
    return this.controller.getPreview().frameFor(element.id) ?? element.frame;
  }

  /** Stage의 포인터 이벤트를 현재 도구의 mm 입력으로 전달한다. */
  private bindPointerEvents(): void {
    this.stage.on("pointerdown", (event) => this.handlePointerDown(event));
    this.stage.on("pointermove", (event) => this.handlePointerMove(event));
    this.stage.on("pointerup pointercancel", (event) => this.forwardPointer("up", event));
    this.stage.on("dblclick dbltap", () => this.requestEdit());
  }

  /** 브라우저 전용 입력을 Konva 밖의 DOM 요소에 연결한다. */
  private bindDomEvents(): void {
    this.stageElement.addEventListener("dragover", this.dragOverListener);
    this.stageElement.addEventListener("drop", this.dropListener);
    this.stageElement.addEventListener("pointerleave", this.leaveListener);
    this.viewportElement.addEventListener("wheel", this.wheelListener, { passive: false });
  }

  /** Space 드래그면 화면 이동으로, 아니면 편집 입력으로 해석한다. */
  private handlePointerDown(event: Konva.KonvaEventObject<PointerEvent>): void {
    if (this.spacePanning) {
      this.panOrigin = {
        x: event.evt.clientX,
        y: event.evt.clientY,
        left: this.viewportElement.scrollLeft,
        top: this.viewportElement.scrollTop,
      };
      return;
    }
    this.forwardPointer("down", event);
  }

  /** 화면 이동·호버 갱신·도구 위임을 한 이동 이벤트에서 구분한다. */
  private handlePointerMove(event: Konva.KonvaEventObject<PointerEvent>): void {
    if (this.panOrigin !== null) {
      this.viewportElement.scrollLeft = this.panOrigin.left - (event.evt.clientX - this.panOrigin.x);
      this.viewportElement.scrollTop = this.panOrigin.top - (event.evt.clientY - this.panOrigin.y);
      return;
    }
    this.updateHover();
    this.forwardPointer("move", event);
  }

  /** 현재 포인터가 있을 때만 px 좌표를 mm로 바꿔 컨트롤러에 위임한다. */
  private forwardPointer(
    kind: "down" | "move" | "up",
    event: Konva.KonvaEventObject<PointerEvent>,
  ): void {
    if (kind === "up") this.panOrigin = null;
    const point = this.pointerMillimeters();
    if (point === null) return;
    const modifiers = {
      additive: event.evt.shiftKey,
      constrain: event.evt.shiftKey,
      spacePanning: this.spacePanning,
    };
    if (kind === "down") this.controller.pointerDown(point.x, point.y, modifiers);
    else if (kind === "move") this.controller.pointerMove(point.x, point.y, modifiers);
    else this.controller.pointerUp(point.x, point.y, modifiers);
  }

  /** 포인터 아래 요소가 바뀔 때만 다시 그려 이동 중 성능을 지킨다. */
  private updateHover(): void {
    const point = this.pointerMillimeters();
    const found = point === null
      ? undefined
      : this.controller.findElementAt(point.x, point.y);
    const nextId = found?.id ?? null;
    if (nextId === this.hoveredElementId) return;
    this.hoveredElementId = nextId;
    this.render();
  }

  /** 캔버스를 벗어나면 남아 있는 강조를 지운다. */
  private clearHover(): void {
    if (this.hoveredElementId === null) return;
    this.hoveredElementId = null;
    this.render();
  }

  /**
   * 더블클릭한 지점이 어떤 편집 대상인지 해석해 입력기를 띄운다.
   *
   * 표는 요소 전체가 아니라 눌린 셀 하나가 대상이므로, 요소를 찾은 뒤
   * 표 안의 위치까지 한 번 더 판정한다.
   */
  private requestEdit(): void {
    const point = this.pointerMillimeters();
    if (point === null) return;
    const element = this.controller.findElementAt(point.x, point.y);
    if (element instanceof TextElement) {
      this.controller.beginEdit({ kind: "text", elementId: element.id });
      return;
    }
    if (!(element instanceof TableElement)) return;
    const target = this.cellLocator.targetAt(element, point.x, point.y);
    if (target === undefined) return;
    this.controller.beginEdit(target);
  }

  /** 보조키를 누른 휠은 확대로, 그 외에는 브라우저 스크롤로 남긴다. */
  private handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const viewport = this.controller.getViewport();
    viewport.setZoom(viewport.getZoom() * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    this.controller.notifyPreviewChange();
  }

  /** 브라우저 기본 동작을 막아 문서가 필드 복사 드롭을 받을 수 있게 한다. */
  private handleDragOver(event: DragEvent): void {
    if (this.callbacks.onFieldDrop === undefined) return;
    event.preventDefault();
    if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "copy";
  }

  /** 화면 픽셀의 드롭 지점을 문서 mm 좌표로 바꿔 디자이너 동작에 전달한다. */
  private handleDrop(event: DragEvent): void {
    if (this.callbacks.onFieldDrop === undefined) return;
    event.preventDefault();
    const bounds = this.stageElement.getBoundingClientRect();
    const metrics = this.metrics();
    this.callbacks.onFieldDrop(
      metrics.toMillimeters(event.clientX - bounds.left),
      metrics.toMillimeters(event.clientY - bounds.top),
    );
  }

  /** 현재 포인터 위치를 문서 mm 좌표로 한 번만 변환한다. */
  private pointerMillimeters(): Readonly<{ x: number; y: number }> | null {
    const position = this.stage.getPointerPosition();
    if (position === null) return null;
    const metrics = this.metrics();
    return {
      x: metrics.toMillimeters(position.x),
      y: metrics.toMillimeters(position.y),
    };
  }

  /** 모든 좌표 변환이 현재 확대율을 즉시 반영하게 한다. */
  private metrics(): CanvasMetrics {
    return new CanvasMetrics(this.controller.getViewport().getZoom());
  }
}
