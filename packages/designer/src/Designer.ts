import {
  Binding,
  FieldElement,
  TextElement,
  TextStyle,
  type Content,
  type FieldSchema,
  type FormatSpec,
  type Frame,
  type Template,
} from "@report-tool/core";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { AddElementCommand } from "./command/AddElementCommand.js";
import { BindFieldCommand } from "./command/BindFieldCommand.js";
import { EditorActions } from "./controller/EditorActions.js";
import { EditorController } from "./controller/EditorController.js";
import { FieldPlacementPlanner } from "./controller/FieldPlacementPlanner.js";
import { FieldTool } from "./tool/FieldTool.js";
import { SelectTool } from "./tool/SelectTool.js";
import { CanvasStage } from "./view/CanvasStage.js";
import { DesignerShell } from "./view/DesignerShell.js";
import { DesignerStyles } from "./view/DesignerStyles.js";
import { KeyboardShortcutAdapter } from "./view/KeyboardShortcutAdapter.js";

/** 호스트가 디자이너를 마운트할 때 제공해야 하는 경계 값을 정의한다. */
export interface DesignerOptions {
  readonly container: HTMLElement;
  readonly template: Template;
  readonly fields: FieldSchema;
  readonly sampleData?: unknown;
  readonly onChange?: (template: Template) => void;
}

/** React와 Konva 내부 구조를 숨기고 호스트에 안정적인 편집기 API만 제공한다. */
export class Designer {
  private readonly controller: EditorController;
  private readonly actions: EditorActions;
  private readonly reactRoot: Root;
  private readonly canvasStage: CanvasStage;
  private readonly mountElement: HTMLDivElement;
  private readonly unsubscribeChange: () => void;
  private readonly keyboardShortcutAdapter: KeyboardShortcutAdapter;
  private readonly fieldPlacementPlanner = new FieldPlacementPlanner();
  private draggedField: Readonly<{
    path: string;
    specification: FieldSchema[string];
  }> | null = null;

  /** Shadow DOM 안에 편집 UI를 마운트하고 도메인 변경 통지를 연결한다. */
  constructor(private readonly options: DesignerOptions) {
    this.controller = new EditorController(options.template, options.sampleData ?? {});
    this.actions = new EditorActions(this.controller);
    this.mountElement = this.createMountElement(options.container);
    this.reactRoot = createRoot(this.mountElement);
    this.renderApplication();
    this.canvasStage = this.createCanvasStage();
    this.keyboardShortcutAdapter = new KeyboardShortcutAdapter(
      this.mountElement,
      this.controller,
      this.actions,
      {
        fitToViewport: () => this.canvasStage.fitToViewport(),
        setSpacePanning: (active) => this.canvasStage.setSpacePanning(active),
      },
    );
    this.unsubscribeChange = this.subscribeTemplateChanges();
  }

  /** 호스트가 저장하거나 미리 볼 최신 불변 템플릿을 즉시 제공한다. */
  getTemplate(): Template {
    return this.controller.getTemplate();
  }

  /** 라우팅 해제 시 React·Konva·구독 자원을 누수 없이 정리한다. */
  destroy(): void {
    this.unsubscribeChange();
    this.keyboardShortcutAdapter.destroy();
    this.canvasStage.destroy();
    this.reactRoot.unmount();
    this.mountElement.remove();
  }

  /** 호스트 스타일이 편집 UI에 침범하지 않는 전용 마운트 지점을 만든다. */
  private createMountElement(container: HTMLElement): HTMLDivElement {
    const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: "open" });
    DesignerStyles.mount(shadowRoot);
    const mountElement = document.createElement("div");
    shadowRoot.append(mountElement);
    return mountElement;
  }

  /** CanvasStage 생성 전에 React 셸의 DOM이 확정되도록 동기 렌더한다. */
  private renderApplication(): void {
    flushSync(() => this.reactRoot.render(createElement(DesignerShell, {
      controller: this.controller,
      actions: this.actions,
      fields: this.options.fields,
      onFieldPick: (path, specification) => this.pickField(path, specification),
      onFieldDragStart: (path, specification) => this.startFieldDrag(path, specification),
      onFieldDragEnd: () => this.endFieldDrag(),
      onCommitText: (element, value) => this.commitText(element, value),
      onFitToViewport: () => this.canvasStage.fitToViewport(),
    })));
  }

  /** React 셸이 만든 두 컨테이너를 검증해 Konva 캔버스를 만든다. */
  private createCanvasStage(): CanvasStage {
    return new CanvasStage(
      this.requireElement("[data-designer-viewport]"),
      this.requireElement("[data-designer-canvas]"),
      this.controller,
      {
        onFieldDrop: (x, y) => this.dropField(x, y),
        onRequestTextEdit: (element) => {
          if (element instanceof TextElement) this.controller.beginTextEdit(element.id);
        },
      },
    );
  }

  /** 셸 구조가 바뀌어 필요한 컨테이너가 사라진 경우를 즉시 드러낸다. */
  private requireElement(selector: string): HTMLDivElement {
    const element = this.mountElement.querySelector<HTMLDivElement>(selector);
    if (element === null) throw new Error(`디자이너 요소 ${selector}를 만들지 못했다`);
    return element;
  }

  /** 캔버스 입력 확정이 문구 종류를 유지한 하나의 변경으로 기록되게 한다. */
  private commitText(element: TextElement, value: string): void {
    const content: Content = { kind: element.content.kind, value };
    this.actions.changeElement(element, element.withContent(content));
    this.controller.endTextEdit();
  }

  /** 선택된 필드는 재바인딩하고 아니면 빈 자리에 즉시 추가해 클릭 결과를 분명히 한다. */
  private pickField(path: string, specification: FieldSchema[string]): void {
    const selected = this.selectedField();
    const formatSpec = this.suggestFormat(specification);
    if (selected === undefined) {
      const frame = this.fieldPlacementPlanner.next(this.controller.getTemplate());
      this.addField(path, formatSpec, frame);
      return;
    }
    const binding = new Binding(path, formatSpec === null ? {} : { formatSpec });
    this.controller.execute(new BindFieldCommand(selected.id, selected.binding, binding));
  }

  /** 팔레트 드래그 동안 문서가 놓을 수 있는 대상임을 화면과 컨트롤러에 알린다. */
  private startFieldDrag(path: string, specification: FieldSchema[string]): void {
    this.draggedField = { path, specification };
    this.controller.setTool(new FieldTool(path, this.suggestFormat(specification)));
    this.canvasStage.setFieldDragActive(true);
  }

  /** 문서 밖에서 드래그가 끝나도 배치 안내와 임시 필드 정보를 남기지 않는다. */
  private endFieldDrag(): void {
    this.draggedField = null;
    this.canvasStage.setFieldDragActive(false);
    if (this.controller.getCurrentToolKind() === "field") {
      this.controller.setTool(new SelectTool());
    }
  }

  /** 팔레트 필드를 놓은 문서 좌표에 추가하고 새 요소를 바로 선택한다. */
  private dropField(x: number, y: number): void {
    if (this.draggedField === null) return;
    const formatSpec = this.suggestFormat(this.draggedField.specification);
    const frame = this.fieldPlacementPlanner.at(this.controller.getTemplate(), x, y);
    this.addField(this.draggedField.path, formatSpec, frame);
    this.draggedField = null;
    this.canvasStage.setFieldDragActive(false);
  }

  /** 클릭과 드롭이 동일한 필드 기본값과 실행 취소 이력을 사용하게 한다. */
  private addField(path: string, formatSpec: FormatSpec | null, frame: Frame): void {
    const binding = new Binding(path, formatSpec === null ? {} : { formatSpec });
    const element = new FieldElement(
      crypto.randomUUID(), frame, this.nextZIndex(), false,
      binding, new TextStyle("Pretendard", 10),
    );
    this.controller.execute(new AddElementCommand(element));
    this.controller.selectElement(element.id);
    this.controller.setTool(new SelectTool());
  }

  /** 새 필드가 기존 요소 위에 보여 선택 결과를 즉시 확인할 수 있게 한다. */
  private nextZIndex(): number {
    const zIndexes = this.controller.getTemplate().getElements().map((element) => element.z);
    return zIndexes.length === 0 ? 0 : Math.max(...zIndexes) + 1;
  }

  /** 현재 단일 선택이 필드일 때만 바인딩 변경 대상으로 반환한다. */
  private selectedField(): FieldElement | undefined {
    const element = this.controller.getSingleSelectedElement();
    return element instanceof FieldElement ? element : undefined;
  }

  /** 민감 필드가 실수로 평문 노출되지 않도록 기본 마스킹을 제안한다. */
  private suggestFormat(specification: FieldSchema[string]): FormatSpec | null {
    if (specification.sensitive !== true) return null;
    return { kind: "mask", keepHead: 6, keepTail: 1 };
  }

  /** 템플릿 참조가 실제로 바뀔 때만 호스트의 onChange를 호출한다. */
  private subscribeTemplateChanges(): () => void {
    let previous = this.controller.getTemplate();
    return this.controller.subscribe(() => {
      const current = this.controller.getTemplate();
      if (current === previous) return;
      previous = current;
      this.options.onChange?.(current);
    });
  }
}
