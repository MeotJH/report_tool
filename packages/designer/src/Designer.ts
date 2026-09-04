import {
  Binding,
  FieldElement,
  type DocumentRenderer,
  type FontProvider,
  type ImageLibrary,
  type Template,
  type TemplateLibrary,
} from "@report-tool/core";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BindFieldCommand } from "./command/BindFieldCommand.js";
import { EditorActions } from "./controller/EditorActions.js";
import { DocumentPreview } from "./controller/DocumentPreview.js";
import { EditorController } from "./controller/EditorController.js";
import { TemplateFiling } from "./controller/TemplateFiling.js";
import { PaletteDrag } from "./controller/PaletteDrag.js";
import type { PaletteEntry } from "./controller/PaletteEntry.js";
import { FieldTool } from "./tool/FieldTool.js";
import { CanvasStage } from "./view/CanvasStage.js";
import { CanvasTextMeasurer } from "./view/CanvasTextMeasurer.js";
import { DesignerShell } from "./view/DesignerShell.js";
import { DesignerStyles } from "./view/DesignerStyles.js";
import { FontLibrary } from "./view/FontLibrary.js";
import { BrowserPreviewLinks } from "./view/BrowserPreviewLinks.js";
import { ImageStore } from "./view/ImageStore.js";
import { KeyboardShortcutAdapter } from "./view/KeyboardShortcutAdapter.js";

/** 호스트가 디자이너를 마운트할 때 제공해야 하는 경계 값을 정의한다. */
export interface DesignerOptions {
  readonly container: HTMLElement;
  readonly template: Template;
  readonly sampleData?: unknown;
  readonly onChange?: (template: Template) => void;
  /**
   * 발행본이 임베딩할 글꼴 파일을 편집기에도 공급한다.
   *
   * 렌더러와 **같은 포트**를 쓴다. 같은 파일로 재야 화면에서 본 줄바꿈이 발행본과
   * 같아진다. 주지 않으면 편집기는 글꼴 이름으로 재고, 그 이름은 보는 사람 컴퓨터에
   * 깔린 글꼴로 해석되어 결과가 사람마다 달라진다. 그 사실은 화면에 표시된다.
   */
  readonly fontProvider?: FontProvider;

  /**
   * 만든 양식을 어디에 보관할지 정한다.
   *
   * 주지 않으면 편집기에 저장·열기가 나오지 않는다. 있지도 않은 보관소에 넣는
   * 시늉을 하면, 담당자는 저장했다고 믿고 창을 닫는다.
   */
  readonly templateLibrary?: TemplateLibrary;

  /**
   * 로고·직인 같은 그림을 어디에 보관할지 정한다.
   *
   * 발행 렌더러가 쓰는 `ImageProvider`를 물려받으므로, 호스트는 같은 객체 하나로
   * 편집 화면과 발행본에 같은 파일을 준다. 주지 않으면 그림을 올릴 수 없고
   * 식별자를 손으로 적는 지금까지의 방식만 남는다.
   */
  readonly imageLibrary?: ImageLibrary;

  /**
   * 발행 직전 PDF를 만들어 주는 경로다.
   *
   * 발행 렌더러는 서버에서만 돌므로, 보통 이 구현은 서버로 요청을 넘긴다.
   * 편집기는 어디서 그리는지 모른다 — 여기에 pdf-lib를 직접 넣으면 편집기 번들에
   * 발행 경로가 통째로 들어오고, 브라우저에서 발행본을 만들 수 있게 된다.
   * 주지 않으면 미리보기 단추가 나오지 않는다.
   */
  readonly documentRenderer?: DocumentRenderer;
}

/** React와 Konva 내부 구조를 숨기고 호스트에 안정적인 편집기 API만 제공한다. */
export class Designer {
  /** 캔버스가 붙을 자리를 기다리는 최대 프레임 수다. 60프레임이면 1초 남짓이다. */
  private static readonly MOUNT_ATTEMPTS = 60;

  private readonly controller: EditorController;
  private readonly actions: EditorActions;
  private readonly filing: TemplateFiling;
  private readonly reactRoot: Root;
  private canvasStage: CanvasStage | null = null;

  /** 캔버스가 준비되기 전에 도착한 그림이 아직 없는 캔버스를 건드리지 않게 한다. */
  private stageReady = false;
  private readonly mountElement: HTMLDivElement;
  private readonly unsubscribeChange: () => void;
  private keyboardShortcutAdapter: KeyboardShortcutAdapter | null = null;

  /** 마운트가 끝나기 전에 걷어냈는지. 그러면 캔버스를 만들지 않는다. */
  private destroyed = false;
  private readonly fonts = new FontLibrary();
  private readonly images: ImageStore;
  private readonly preview: DocumentPreview;
  private draggedItem: PaletteDrag | null = null;

  /** Shadow DOM 안에 편집 UI를 마운트하고 도메인 변경 통지를 연결한다. */
  constructor(private readonly options: DesignerOptions) {
    // 쪽 나눔은 줄 수가 정하고 줄 수는 글자 폭이 정한다. 호스트가 준 글꼴 파일로
    // 재는 측정기를 넘겨야 편집 화면의 쪽 나눔이 발행본과 같아진다.
    const measurer = new CanvasTextMeasurer(this.fonts);
    this.controller = new EditorController(
      options.template,
      options.sampleData ?? {},
      (style) => measurer.forStyle(style),
    );
    this.actions = new EditorActions(this.controller);
    this.filing = new TemplateFiling(this.controller, options.templateLibrary ?? null);
    // 그림은 받아 온 뒤에야 그릴 수 있다. 받으면 캔버스를 다시 그려야 자리표시자가
    // 실제 로고로 바뀐다.
    this.images = new ImageStore(
      options.imageLibrary ?? null,
      undefined,
      () => this.onImagesChanged(),
    );
    this.preview = new DocumentPreview(
      this.controller,
      options.documentRenderer ?? null,
      new BrowserPreviewLinks(),
    );
    this.mountElement = this.createMountElement(options.container);
    this.reactRoot = createRoot(this.mountElement);
    this.renderApplication();
    this.unsubscribeChange = this.subscribeTemplateChanges();
    void this.finishMount();
  }

  /**
   * React가 실제로 DOM을 그린 뒤에 캔버스를 얹는다.
   *
   * 예전에는 `flushSync`로 렌더를 강제해 같은 줄에서 캔버스를 만들었다. 그런데
   * **호스트가 React 앱이면 그 방법이 통하지 않는다** — `useEffect` 안에서 편집기를
   * 만드는 순간 React가 "이미 렌더 중"이라며 `flushSync`를 무시하고, 캔버스가 붙을
   * 자리를 찾지 못해 편집기가 통째로 뜨지 않는다. React 호스트에 붙이는 것이 이
   * 라이브러리의 주된 쓰임인데 그 길이 막혀 있었다.
   *
   * 그래서 강제하지 않고 기다린다. 한 프레임 늦게 나타나지만 어디에 붙이든 뜬다.
   */
  private async finishMount(): Promise<void> {
    const viewport = await this.waitForElement("[data-designer-viewport]");
    if (this.destroyed || viewport === null) return;
    this.canvasStage = this.createCanvasStage();
    this.stageReady = true;
    this.keyboardShortcutAdapter = new KeyboardShortcutAdapter(
      this.mountElement,
      this.controller,
      this.actions,
      {
        fitToViewport: () => this.canvasStage?.fitToViewport(),
        setSpacePanning: (active) => this.canvasStage?.setSpacePanning(active),
      },
    );
    this.loadFonts();
  }

  /**
   * 그 요소가 나타날 때까지 프레임 단위로 기다린다.
   *
   * 무한정 기다리지 않는다. 호스트가 컨테이너를 곧바로 화면에서 빼는 경우가 있고,
   * 그때 조용히 매달려 있으면 왜 편집기가 안 뜨는지 알 수 없다.
   */
  private async waitForElement(selector: string): Promise<HTMLDivElement | null> {
    for (let attempt = 0; attempt < Designer.MOUNT_ATTEMPTS; attempt += 1) {
      const found = this.mountElement.querySelector<HTMLDivElement>(selector);
      if (found !== null) return found;
      if (this.destroyed) return null;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    throw new Error(`디자이너 요소 ${selector}를 만들지 못했다`);
  }

  /**
   * 호스트가 준 글꼴 파일을 등록하고 화면을 다시 그린다.
   *
   * 파일을 받는 동안에는 글꼴 이름으로 재고 있으므로 줄이 잠깐 다를 수 있다.
   * 다 받은 뒤 반드시 다시 그려야 그 차이가 남지 않는다.
   */
  private loadFonts(): void {
    const provider = this.options.fontProvider;
    if (provider === undefined) return;
    void this.fonts
      .load(provider, this.controller.getTemplate().fonts)
      .then(() => {
        this.controller.notifyPreviewChange();
        this.canvasStage?.render();
      });
  }

  /**
   * 호스트가 저장하거나 미리 볼 최신 불변 템플릿을 즉시 제공한다.
   *
   * 저장할 때는 `getTemplate().toJSON()`을, 다시 열 때는 core의
   * `TemplateFactory.fromJSON()`을 사용한다. 편집기는 I/O를 하지 않는다.
   */
  getTemplate(): Template {
    return this.controller.getTemplate();
  }

  /** 라우팅 해제 시 React·Konva·구독 자원을 누수 없이 정리한다. */
  destroy(): void {
    this.destroyed = true;
    this.unsubscribeChange();
    this.keyboardShortcutAdapter?.destroy();
    this.canvasStage?.destroy();
    this.reactRoot.unmount();
    this.mountElement.remove();
  }

  /**
   * 호스트 스타일이 편집 UI에 침범하지 않는 전용 마운트 지점을 만든다.
   *
   * 이 중간 요소에 표시를 남기는 이유는 높이 때문이다. 높이가 지정되지 않은
   * 요소를 사이에 두면 편집기의 `height: 100%`가 auto로 풀려 내부 스크롤이
   * 동작하지 않고 화면 밖으로 계속 자란다.
   */
  private createMountElement(container: HTMLElement): HTMLDivElement {
    const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: "open" });
    DesignerStyles.mount(shadowRoot);
    const mountElement = document.createElement("div");
    mountElement.setAttribute("data-designer-root", "");
    shadowRoot.append(mountElement);
    return mountElement;
  }

  /** CanvasStage 생성 전에 React 셸의 DOM이 확정되도록 동기 렌더한다. */
  private renderApplication(): void {
    this.reactRoot.render(createElement(DesignerShell, {
      controller: this.controller,
      actions: this.actions,
      filing: this.filing,
      images: this.images,
      preview: this.preview,
      onFieldPick: (item) => this.pickField(item),
      onFieldDragStart: (item) => this.startFieldDrag(item),
      onFieldDragEnd: () => this.endFieldDrag(),
      onFitToViewport: () => this.canvasStage?.fitToViewport(),
      fonts: this.fonts,
    }));
  }

  /** React 셸이 만든 두 컨테이너를 검증해 Konva 캔버스를 만든다. */
  private createCanvasStage(): CanvasStage {
    return new CanvasStage(
      this.requireElement("[data-designer-viewport]"),
      this.requireElement("[data-designer-canvas]"),
      this.controller,
      { onFieldDrop: (x, y) => this.dropPaletteItem(x, y) },
      this.fonts,
      this.images,
    );
  }

  /**
   * 그림을 받아 온 뒤 화면을 다시 그린다.
   *
   * 캔버스를 만들기 전에도 불릴 수 있다(첫 그리기 도중에 도착한 경우). 그때는
   * 곧 그려지므로 아무것도 하지 않는다.
   */
  private onImagesChanged(): void {
    if (!this.stageReady) return;
    this.controller.notifyPreviewChange();
    this.canvasStage?.render();
  }

  /** 셸 구조가 바뀌어 필요한 컨테이너가 사라진 경우를 즉시 드러낸다. */
  private requireElement(selector: string): HTMLDivElement {
    const element = this.mountElement.querySelector<HTMLDivElement>(selector);
    if (element === null) throw new Error(`디자이너 요소 ${selector}를 만들지 못했다`);
    return element;
  }

  /**
   * 클릭 결과를 선택 상태에 따라 나눈다.
   *
   * 필드가 선택된 상태에서 단일 필드를 고르는 것은 "이 자리의 연결을 바꿔라"이고,
   * 그 밖의 경우는 "새로 만들어라"이다. 배열은 연결 대상이 표이므로 늘 새로 만든다.
   */
  private pickField(entry: PaletteEntry): void {
    const selected = this.selectedField();
    if (selected === undefined || entry.type === "array") {
      PaletteDrag.create(entry).place(this.controller);
      return;
    }
    const binding = new Binding(entry.path);
    this.controller.execute(new BindFieldCommand(selected.id, selected.binding, binding));
  }

  /** 팔레트 드래그 동안 문서가 무엇을 받을지 화면과 컨트롤러에 알린다. */
  private startFieldDrag(entry: PaletteEntry): void {
    this.draggedItem = PaletteDrag.create(entry);
    this.controller.setPaletteDropHint(this.dropHintFor(entry));
    if (entry.type !== "array") {
      this.controller.setTool(new FieldTool(entry.path, null));
    }
    this.canvasStage?.setFieldDragActive(true);
  }

  /** 문서 밖에서 드래그가 끝나도 배치 안내와 임시 정보를 남기지 않는다. */
  private endFieldDrag(): void {
    this.draggedItem = null;
    this.controller.setPaletteDropHint(null);
    this.canvasStage?.setFieldDragActive(false);
    if (this.controller.getCurrentToolKind() === "field") {
      this.controller.activateSelectTool();
    }
  }

  /** 놓은 좌표를 어떻게 해석할지는 끌어온 항목이 스스로 결정하게 한다. */
  private dropPaletteItem(xMm: number, yMm: number): void {
    const dragged = this.draggedItem;
    this.endFieldDrag();
    dragged?.dropAt(xMm, yMm, this.controller);
  }

  /** 끌고 있는 항목이 만들 결과를 놓기 전에 문장으로 알려준다. */
  private dropHintFor(entry: PaletteEntry): string {
    if (entry.type === "array") {
      return `${entry.label} 배열을 놓으면 반복 표가 만들어집니다`;
    }
    if (entry.arrayPath === null) {
      return `${entry.label} 값을 놓을 위치를 고르세요`;
    }
    return `${entry.label}을 표의 열에 놓으면 그 열이 다시 연결됩니다`;
  }

  /** 현재 단일 선택이 필드일 때만 바인딩 변경 대상으로 반환한다. */
  private selectedField(): FieldElement | undefined {
    const element = this.controller.getSingleSelectedElement();
    return element instanceof FieldElement ? element : undefined;
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
