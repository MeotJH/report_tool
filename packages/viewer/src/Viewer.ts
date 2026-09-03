import { SigningApiClient, type SignatureSubmission } from "./infrastructure/SigningApiClient.js";
import { SignaturePad } from "./signature/SignaturePad.js";
import { PdfDocumentView } from "./view/PdfDocumentView.js";
import { VIEWER_CSS } from "./ViewerStyles.js";

/** 호스트가 수신자 화면을 띄울 때 주는 값이다. */
export interface ViewerOptions {
  readonly container: HTMLElement;

  /** 배포 링크에 담겨 온 토큰이다. 이것 하나로 문서와 수신자가 정해진다. */
  readonly token: string;

  /** report-tool 서버가 붙어 있는 주소다. 예: `/api/report`. */
  readonly apiBaseUrl: string;

  /** 서명이 접수된 뒤 호스트가 할 일이 있으면 받는다. */
  readonly onSigned?: () => void;

  /**
   * pdf.js 작업자 파일 주소다.
   *
   * 번들러마다 파일을 두는 자리가 달라 호스트가 정한다. 주지 않으면 본 스레드에서
   * 해석하고, 그동안 화면이 멈춘다.
   */
  readonly pdfWorkerSrc?: string;

  /** 수신자가 어떻게 확인됐는지. 링크를 만든 쪽이 안다. */
  readonly authMethod?: SignatureSubmission["authMethod"];
}

/**
 * 수신자가 링크를 열었을 때 뜨는 화면 전체다.
 *
 * 화면은 셋 중 하나다 — 받아 오는 중, 문서와 서명칸, 서명 완료. 실패는 화면을
 * 비우지 않고 그 자리에 이유를 적는다. 링크가 만료된 사람과 서명을 비워 둔 사람이
 * 해야 할 일이 다르기 때문이다.
 *
 * **문서를 다시 만들지 않는다.** 서버가 준 바이트를 그대로 그린다(`PdfDocumentView`).
 * 수신자가 본 것과 해시가 걸린 파일이 같아야 "무엇에 서명했는가"가 성립한다.
 */
export class Viewer {
  private readonly root: ShadowRoot;
  private readonly client: SigningApiClient;
  private pad: SignaturePad | null = null;

  /** 화면을 붙이고 곧바로 문서를 받아 온다. */
  constructor(private readonly options: ViewerOptions) {
    if (options.pdfWorkerSrc !== undefined) PdfDocumentView.useWorker(options.pdfWorkerSrc);
    this.client = new SigningApiClient(options.apiBaseUrl);
    this.root = options.container.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = VIEWER_CSS;
    this.root.append(style);
    this.showMessage("문서를 받아오는 중…");
    void this.load();
  }

  /** 화면에서 걷어낼 때 리스너를 남기지 않는다. */
  destroy(): void {
    this.pad?.destroy();
    this.pad = null;
    this.root.replaceChildren();
  }

  /** 토큰으로 문서를 받아 그리고, 이미 서명된 문서면 서명칸을 내지 않는다. */
  private async load(): Promise<void> {
    try {
      const { pdfBytes, status } = await this.client.fetchDocument(this.options.token);
      if (status === "signed") {
        this.showDone();
        return;
      }
      await this.showDocument(pdfBytes);
    } catch (error) {
      this.showMessage(Viewer.describe(error), true);
    }
  }

  /** 문서와 서명칸을 한 화면에 짜 넣는다. */
  private async showDocument(pdfBytes: Uint8Array): Promise<void> {
    const screen = this.replaceBody();
    const pages = document.createElement("div");
    pages.className = "rt-viewer-pages";
    screen.append(pages, this.createSignArea());
    await new PdfDocumentView(pages).show(pdfBytes);
  }

  /** 서명칸·지우기·서명 완료를 한 덩어리로 만든다. */
  private createSignArea(): HTMLElement {
    const area = document.createElement("section");
    area.className = "rt-viewer-sign";
    const canvas = document.createElement("canvas");
    canvas.className = "rt-viewer-pad";
    canvas.width = 600;
    canvas.height = 160;
    const submit = Viewer.createButton("서명 완료", "rt-viewer-button rt-viewer-button--primary");
    submit.disabled = true;
    const clear = Viewer.createButton("지우기", "rt-viewer-button");
    const actions = document.createElement("div");
    actions.className = "rt-viewer-actions";
    actions.append(clear, submit);
    area.append(
      Viewer.createText("여기에 서명해 주세요", "rt-viewer-sign-title"),
      Viewer.createText("위 문서를 확인한 뒤 서명합니다.", "rt-viewer-sign-hint"),
      canvas,
      actions,
    );
    this.bindSigning(canvas, clear, submit);
    return area;
  }

  /**
   * 서명칸과 두 단추를 잇는다.
   *
   * 빈 서명으로는 누를 수 없게 한다. 서버도 거절하지만(422), 눌러 보고 거절당하는
   * 것보다 누를 수 없는 편이 무엇을 해야 하는지 분명하다.
   */
  private bindSigning(
    canvas: HTMLCanvasElement,
    clear: HTMLButtonElement,
    submit: HTMLButtonElement,
  ): void {
    const pad = new SignaturePad(canvas);
    this.pad = pad;
    const sync = (): void => { submit.disabled = pad.isEmpty(); };
    canvas.addEventListener("pointerup", sync);
    canvas.addEventListener("pointerleave", sync);
    clear.addEventListener("click", () => { pad.clear(); sync(); });
    submit.addEventListener("click", () => { void this.submit(pad, submit); });
  }

  /** 서명을 보내고, 성공하면 화면을 완료로 바꾼다. */
  private async submit(pad: SignaturePad, submit: HTMLButtonElement): Promise<void> {
    submit.disabled = true;
    try {
      await this.client.submitSignature(this.options.token, {
        strokes: pad.getStrokes(),
        imagePng: pad.toPng(),
        authMethod: this.options.authMethod ?? "email_link",
      });
      this.showDone();
      this.options.onSigned?.();
    } catch (error) {
      // 화면을 비우지 않는다. 그린 서명이 사라지면 처음부터 다시 그려야 한다.
      this.showBanner(Viewer.describe(error));
      submit.disabled = false;
    }
  }

  /** 안내 한 줄만 있는 화면으로 바꾼다. */
  private showMessage(text: string, failed = false): void {
    const screen = this.replaceBody();
    screen.append(Viewer.createText(
      text,
      failed ? "rt-viewer-message rt-viewer-message--error" : "rt-viewer-message",
    ));
  }

  /** 서명이 끝났음을 알리는 화면으로 바꾼다. */
  private showDone(): void {
    this.pad?.destroy();
    this.pad = null;
    const screen = this.replaceBody();
    screen.append(Viewer.createText("서명이 접수되었습니다.", "rt-viewer-done"));
  }

  /** 지금 화면 맨 위에 실패 이유를 끼운다. 그린 것은 그대로 둔다. */
  private showBanner(text: string): void {
    const screen = this.root.querySelector(".rt-viewer");
    screen?.prepend(Viewer.createText(text, "rt-viewer-message rt-viewer-message--error"));
  }

  /** 스타일은 남기고 화면 내용만 갈아 끼운다. */
  private replaceBody(): HTMLElement {
    this.root.querySelector(".rt-viewer")?.remove();
    const screen = document.createElement("div");
    screen.className = "rt-viewer";
    this.root.append(screen);
    return screen;
  }

  /** 글자 한 덩어리를 만든다. */
  private static createText(text: string, className: string): HTMLElement {
    const element = document.createElement("p");
    element.className = className;
    element.textContent = text;
    return element;
  }

  /** 단추 하나를 만든다. */
  private static createButton(label: string, className: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }

  /** 무엇을 던지든 사람이 읽을 수 있는 한 줄로 만든다. */
  private static describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
