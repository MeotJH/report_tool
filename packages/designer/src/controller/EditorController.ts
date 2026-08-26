import type { Element, Frame, Template } from "@report-tool/core";
import type { CanvasEditTarget } from "./CanvasEditTarget.js";
import { AddElementCommand } from "../command/AddElementCommand.js";
import { CommandStack } from "../command/CommandStack.js";
import type { EditorCommand } from "../command/EditorCommand.js";
import type { EditorTool, ToolKind } from "../tool/EditorTool.js";
import { SelectTool } from "../tool/SelectTool.js";
import { ElementClipboard } from "./ElementClipboard.js";
import { SelectionModel } from "./SelectionModel.js";
import { TransformPreview } from "./TransformPreview.js";
import { ViewportState } from "./ViewportState.js";

/** 같은 화면에서 설계 상태와 실제 데이터 표시를 전환할 수 있게 제한한다. */
export type EditorMode = "design" | "preview";

/**
 * 템플릿·선택·도구·명령 이력·보기 상태를 한 상태 경계에서 조율한다.
 *
 * 화면 여러 곳(캔버스·Inspector·Layers)이 같은 선택과 같은 값을 보여야 하므로
 * 상태를 각 화면이 따로 갖지 않고 이 클래스 하나만 읽게 한다.
 */
export class EditorController {
  private template: Template;
  private readonly selectionModel = new SelectionModel();
  private readonly commandStack = new CommandStack();
  private readonly viewport = new ViewportState();
  private readonly transformPreview = new TransformPreview();
  private readonly clipboard = new ElementClipboard();
  private currentTool: EditorTool = new SelectTool();
  private readonly listeners = new Set<() => void>();
  private mode: EditorMode = "design";
  private editTarget: CanvasEditTarget | null = null;
  private notice: string | null = null;
  private paletteDropHint: string | null = null;
  private highlightedPath: string | null = null;
  private activePageIndex = 0;
  private revision = 0;

  /** 호스트가 제공한 초안과 샘플 데이터로 독립적인 편집 세션을 시작한다. */
  constructor(
    initialTemplate: Template,
    private readonly sampleData: unknown = {},
  ) {
    this.template = initialTemplate;
  }

  /** React와 Konva가 동일한 최신 불변 템플릿을 읽게 한다. */
  getTemplate(): Template {
    return this.template;
  }

  /** 미리보기 모드가 호스트 주입 데이터를 그대로 사용하게 한다. */
  getSampleData(): unknown {
    return this.sampleData;
  }

  /** 도구와 화면 강조가 같은 선택 상태를 공유하게 한다. */
  getSelectionModel(): SelectionModel {
    return this.selectionModel;
  }

  /** 캔버스와 상태바가 같은 확대·이동 상태를 사용하게 한다. */
  getViewport(): ViewportState {
    return this.viewport;
  }

  /** 캔버스가 확정 전 드래그 상태를 한곳에서 읽게 한다. */
  getPreview(): TransformPreview {
    return this.transformPreview;
  }

  /** 복사·붙여넣기 동작이 같은 편집기 전용 보관소를 쓰게 한다. */
  getClipboard(): ElementClipboard {
    return this.clipboard;
  }

  /** 툴바가 실제 포인터 해석 전략과 같은 항목을 활성화하게 한다. */
  getCurrentToolKind(): ToolKind {
    return this.currentTool.kind;
  }

  /** 도구별 포인터 해석 전략을 런타임에 교체한다. */
  setTool(tool: EditorTool): void {
    this.currentTool = tool;
    this.transformPreview.clear();
    this.notifyChange();
  }

  /**
   * 생성 도구가 작업을 마친 뒤 선택 상태로 돌아가게 한다.
   *
   * 도구가 SelectTool을 직접 import하면 EditorTool과 SelectTool이 서로를
   * 참조해 모듈 초기화 순서에 따라 클래스가 undefined가 된다.
   */
  activateSelectTool(): void {
    this.setTool(new SelectTool());
  }

  /** 지금 편집 중인 쪽을 캔버스·도구·Inspector가 함께 읽게 한다. */
  getActivePageIndex(): number {
    return this.activePageIndex;
  }

  /**
   * 편집할 쪽을 바꾼다. 다른 쪽 요소가 선택된 채로 남지 않게 한다.
   *
   * 보이지 않는 요소가 선택돼 있으면 Delete가 화면에 없는 것을 지운다. 사용자는
   * 무엇이 사라졌는지 알 수 없다.
   */
  setActivePageIndex(pageIndex: number): void {
    const clamped = Math.max(0, Math.min(pageIndex, this.pageCount()));
    if (clamped === this.activePageIndex) return;
    this.activePageIndex = clamped;
    this.selectionModel.clear();
    this.notifyChange();
  }

  /**
   * 편집기가 오갈 수 있는 쪽 수다. 아직 비어 있는 새 쪽도 한 장으로 센다.
   *
   * 쪽 수는 요소가 정하므로(`Template.pageCount`) 빈 쪽은 저장되지 않는다.
   * 그래도 요소를 놓기 전에 그 쪽으로 갈 수 있어야 쪽을 만들 수 있다.
   */
  pageCount(): number {
    return Math.max(this.template.pageCount(), this.activePageIndex + 1);
  }

  /**
   * 새 요소를 지금 보고 있는 쪽에 놓고 바로 손볼 수 있게 선택한다.
   *
   * 도구·팔레트 드롭·배열 드롭이 각자 쪽 번호를 붙이면 한 곳만 빠뜨려도 그
   * 요소는 첫 쪽에 생긴다. 만든 사람 눈에는 요소가 나타나지 않는다.
   */
  placeNewElement(element: Element): void {
    const placed = element.withPageIndex(this.activePageIndex);
    this.execute(new AddElementCommand(placed));
    this.selectElement(placed.id);
    this.activateSelectTool();
  }

  /** 설계용 표시와 실제 데이터 표시를 같은 위치에서 전환하게 한다. */
  setMode(mode: EditorMode): void {
    this.mode = mode;
    this.notifyChange();
  }

  /** 캔버스가 Token chip과 실제 값 중 무엇을 그릴지 판단하게 한다. */
  getMode(): EditorMode {
    return this.mode;
  }

  /**
   * 팔레트에서 고른 데이터 경로를 캔버스가 강조하게 한다.
   *
   * 목록에서 항목을 누르는 행동이 문서를 바꾸지 않으려면 대신 무언가는 보여줘야
   * 한다. 그 경로를 쓰는 요소가 문서 어디에 있는지가 사용자가 가장 알고 싶은 것이다.
   */
  setHighlightedPath(path: string | null): void {
    this.highlightedPath = path;
    this.notifyChange();
  }

  /** 캔버스와 팔레트가 같은 강조 대상을 공유하게 한다. */
  getHighlightedPath(): string | null {
    return this.highlightedPath;
  }

  /**
   * 팔레트 항목을 끌고 있는 동안 문서가 무엇을 받을지 알린다.
   *
   * 도구 종류로 이 상태를 대신 표현하면, 배열을 끌 때도 "필드 도구"가 켜져
   * 화면 안내와 실제로 만들어지는 것이 어긋난다.
   */
  setPaletteDropHint(hint: string | null): void {
    this.paletteDropHint = hint;
    this.notifyChange();
  }

  /** 캔버스와 팔레트가 같은 드롭 안내를 보여주게 한다. */
  getPaletteDropHint(): string | null {
    return this.paletteDropHint;
  }

  /**
   * 방금 일어난 변경 중 사용자가 놓치면 안 되는 것을 알린다.
   *
   * 정적 표를 데이터 표로 바꾸면 입력했던 행이 사라지는데, 조용히 처리하면
   * 사용자는 값을 잃은 것을 모른다. 막지 않고 알리는 쪽을 택한 이유는
   * 모든 변경이 Undo 한 번으로 복원되기 때문이다.
   */
  setNotice(message: string): void {
    this.notice = message;
    this.notifyChange();
  }

  /** 상태바가 현재 알릴 내용이 있는지 확인하게 한다. */
  getNotice(): string | null {
    return this.notice;
  }

  /** 사용자가 확인한 알림을 지운다. */
  clearNotice(): void {
    if (this.notice === null) return;
    this.notice = null;
    this.notifyChange();
  }

  /** 캔버스 위 입력기가 무엇을 편집 중인지 한곳에서 관리한다. */
  beginEdit(target: CanvasEditTarget): void {
    this.editTarget = target;
    this.notifyChange();
  }

  /** 입력 확정과 취소가 같은 종료 경로를 사용하게 한다. */
  endEdit(): void {
    if (this.editTarget === null) return;
    this.editTarget = null;
    this.notifyChange();
  }

  /** 화면이 현재 편집 대상을 읽어 입력기를 그리게 한다. */
  getEditTarget(): CanvasEditTarget | null {
    return this.editTarget;
  }

  /**
   * 입력기가 요소를 완전히 덮는 경우에만 원래 도형을 감춘다.
   *
   * 표의 셀을 고칠 때 표 전체를 감추면 나머지 행이 사라져 위치 감각을 잃는다.
   */
  getElementHiddenWhileEditing(): string | null {
    if (this.editTarget?.kind !== "text") return null;
    return this.editTarget.elementId;
  }

  /** 명령 실행 결과를 현재 상태로 채택하고 모든 구독자에게 알린다. */
  execute(command: EditorCommand): void {
    this.template = this.commandStack.execute(command, this.template);
    this.afterTemplateChange();
  }

  /** 취소할 명령이 있을 때만 템플릿을 갱신하고 알린다. */
  undo(): void {
    const previous = this.commandStack.undo(this.template);
    if (previous === null) return;
    this.template = previous;
    this.afterTemplateChange();
  }

  /** 다시 실행할 명령이 있을 때만 템플릿을 갱신하고 알린다. */
  redo(): void {
    const next = this.commandStack.redo(this.template);
    if (next === null) return;
    this.template = next;
    this.afterTemplateChange();
  }

  /** 현재 명령 이력을 바탕으로 undo 가능 여부를 UI에 제공한다. */
  canUndo(): boolean {
    return this.commandStack.canUndo();
  }

  /** 현재 명령 이력을 바탕으로 redo 가능 여부를 UI에 제공한다. */
  canRedo(): boolean {
    return this.commandStack.canRedo();
  }

  /** 상태 변경 리스너를 등록하고 정확히 같은 리스너를 제거하는 함수를 제공한다. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 화면 좌표에서 클릭으로 잡을 수 있는 가장 위의 요소를 찾는다.
   *
   * 숨김과 잠금 요소를 건너뛰는 이유는, 배경으로 깔아둔 상자를 잠근 사용자가
   * 그 위의 내용을 클릭하려 할 때 매번 배경이 잡히면 편집이 불가능하기 때문이다.
   * 잠긴 요소는 Layers 패널에서 선택한다.
   */
  findElementAt(xMm: number, yMm: number): Element | undefined {
    return this.selectableElements()
      .sort((first, second) => second.z - first.z)
      .find((element) => element.frame.contains(xMm, yMm));
  }

  /** 영역 선택이 완전히 포함된 요소만 고르게 한다. */
  findElementsWithin(area: Frame): readonly Element[] {
    return this.selectableElements().filter((element) => (
      element.frame.x >= area.x
      && element.frame.y >= area.y
      && element.frame.x + element.frame.width <= area.x + area.width
      && element.frame.y + element.frame.height <= area.y + area.height
    ));
  }

  /** Inspector와 명령이 같은 방식으로 대상 요소를 찾게 한다. */
  getElement(elementId: string): Element | undefined {
    return this.template.getElements().find((element) => element.id === elementId);
  }

  /** 여러 화면이 선택 요소 목록을 각자 계산하지 않게 한다. */
  getSelectedElements(): readonly Element[] {
    return this.template.getElements()
      .filter((element) => this.selectionModel.isSelected(element.id));
  }

  /** 단일 선택 대상 Inspector가 대상 요소를 간단히 얻게 한다. */
  getSingleSelectedElement(): Element | undefined {
    const selected = this.getSelectedElements();
    return selected.length === 1 ? selected[0] : undefined;
  }

  /** 스냅 후보에서 함께 움직이는 요소를 제외하게 한다. */
  getFramesExcept(elementIds: readonly string[]): readonly Frame[] {
    const excluded = new Set(elementIds);
    return this.template.getElements()
      .filter((element) => !excluded.has(element.id) && !element.hidden)
      .map((element) => element.frame);
  }

  /** 선택 변경도 템플릿 변경과 같은 렌더 갱신 경로를 사용하게 한다. */
  selectElement(elementId: string | null, additive = false): void {
    if (elementId === null) this.selectionModel.clear();
    else if (additive) this.selectionModel.toggle(elementId);
    else this.selectionModel.select(elementId);
    this.notifyChange();
  }

  /** 영역 선택과 전체 선택이 선택 집합을 한 번에 교체하게 한다. */
  selectElements(elementIds: readonly string[]): void {
    this.selectionModel.selectAll(elementIds);
    this.notifyChange();
  }

  /** 도구가 화면 전용 상태를 바꾼 뒤 다시 그리도록 알린다. */
  notifyPreviewChange(): void {
    this.notifyChange();
  }

  /** 드래그 종료 시 화면 전용 상태를 한 번에 비운다. */
  clearPreview(): void {
    this.transformPreview.clear();
    this.notifyChange();
  }

  /** React 구독이 템플릿 외 선택·도구 변경도 새 상태로 인식하게 한다. */
  getRevision(): number {
    return this.revision;
  }

  /** 픽셀에서 변환된 포인터 시작 좌표를 현재 도구에 위임한다. */
  pointerDown(xMm: number, yMm: number, modifiers: PointerModifiers = {}): void {
    this.currentTool.onPointerDown(xMm, yMm, this, modifiers);
  }

  /** 픽셀에서 변환된 포인터 이동 좌표를 현재 도구에 위임한다. */
  pointerMove(xMm: number, yMm: number, modifiers: PointerModifiers = {}): void {
    this.currentTool.onPointerMove(xMm, yMm, this, modifiers);
  }

  /** 픽셀에서 변환된 포인터 종료 좌표를 현재 도구에 위임한다. */
  pointerUp(xMm: number, yMm: number, modifiers: PointerModifiers = {}): void {
    this.currentTool.onPointerUp(xMm, yMm, this, modifiers);
  }

  /** 삭제로 사라진 요소가 선택에 남지 않도록 템플릿 변경 뒤 정리한다. */
  private afterTemplateChange(): void {
    this.selectionModel.retainOnly(
      this.template.getElements().map((element) => element.id),
    );
    this.transformPreview.clear();
    this.notice = null;
    this.notifyChange();
  }

  /** 클릭과 영역 선택이 같은 후보 집합을 사용하게 한다. */
  private selectableElements(): Element[] {
    return this.elementsOnActivePage()
      .filter((element) => !element.hidden && !element.locked);
  }

  /**
   * 보고 있지 않은 쪽의 요소가 선택·판정에 끼어들지 않게 한다.
   *
   * 모든 쪽에 반복되는 요소는 어느 쪽에서도 보이고 고칠 수 있어야 한다. 그렇지
   * 않으면 쪽 번호를 만든 쪽으로 돌아가야만 고칠 수 있다.
   */
  elementsOnActivePage(): Element[] {
    return this.template.getElements().filter(
      (element) => element.repeated || element.pageIndex === this.activePageIndex,
    );
  }

  /** 외부 화면 상태가 최신 컨트롤러 상태를 다시 읽도록 순서대로 호출한다. */
  private notifyChange(): void {
    this.revision += 1;
    for (const listener of this.listeners) listener();
  }
}

/** 같은 드래그가 보조키에 따라 다른 의미를 갖도록 입력 상태를 함께 전달한다. */
export interface PointerModifiers {
  readonly additive?: boolean;
  readonly constrain?: boolean;
  readonly spacePanning?: boolean;
}
