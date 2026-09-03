import type { DocumentRenderer } from "@report-tool/core";
import type { EditorController } from "./EditorController.js";
import { PreviewState } from "./PreviewState.js";

/** PDF 바이트를 브라우저가 띄울 수 있는 주소로 바꾸는 일만 분리해 검증 가능하게 한다. */
export interface PreviewLinkFactory {
  /** 바이트를 이 창에서만 쓸 임시 주소로 만든다. */
  create(bytes: Uint8Array): string;

  /** 다 쓴 주소를 반납한다. 반납하지 않으면 창을 닫아도 메모리가 남는다. */
  revoke(url: string): void;
}

/**
 * 발행 전에 실제 PDF를 편집기 안에서 보게 한다.
 *
 * 캔버스는 발행본과 같은 배치를 쓰지만 같은 그림은 아니다. 글자 폭 소수점,
 * 자간, 워터마크처럼 마지막까지 남는 차이는 PDF를 열어 봐야 드러난다.
 *
 * **렌더는 호스트가 한다.** 발행 렌더러는 서버에서만 돌기 때문이다. 편집기가 아는
 * 것은 `DocumentRenderer` 포트 하나뿐이고, 그것을 브라우저에서 부를지 서버로
 * 넘길지는 호스트가 정한다. 이 자리에 pdf-lib를 직접 넣으면 편집기 번들에 발행
 * 경로가 통째로 들어오고, 브라우저에서 발행본을 만들 수 있게 된다.
 */
export class DocumentPreview {
  private current: PreviewState = PreviewState.closed();

  /** 반납해야 하는 주소를 따로 들고 있는다. 상태만으로는 실패로 바뀐 뒤 잃는다. */
  private issuedUrl: string | null = null;

  private readonly listeners = new Set<() => void>();

  /** 편집 세션·렌더 경로·주소 발급기를 주입받아 브라우저 없이도 규칙을 검증하게 한다. */
  constructor(
    private readonly controller: EditorController,
    private readonly renderer: DocumentRenderer | null,
    private readonly links: PreviewLinkFactory,
  ) {}

  /** 호스트가 렌더 경로를 주지 않으면 미리보기 단추 자체를 보여 주지 않는다. */
  isAvailable(): boolean {
    return this.renderer !== null;
  }

  /** 지금 보여 줄 미리보기 상태다. */
  state(): PreviewState {
    return this.current;
  }

  /**
   * 지금 문서를 PDF로 만들어 창에 띄운다.
   *
   * **`preview` 모드로만 부른다.** 발행본은 데이터·템플릿·해시를 동결하는 별개의
   * 절차이고, 편집기에서 그 길로 들어가면 초안이 발행된 문서로 남는다.
   *
   * 만드는 중에 또 부르면 아무 일도 하지 않는다. 두 번 부르면 나중에 끝난 것이
   * 앞의 주소를 덮어써, 반납하지 못한 주소가 남는다.
   */
  async open(): Promise<void> {
    const renderer = this.renderer;
    if (renderer === null || this.current.isWorking()) return;
    this.releaseUrl();
    this.moveTo(PreviewState.working());
    try {
      const bytes = await renderer.render(
        this.controller.getTemplate(),
        this.controller.getSampleData(),
        "preview",
      );
      this.issuedUrl = this.links.create(bytes);
      this.moveTo(PreviewState.ready(this.issuedUrl));
    } catch (error) {
      this.moveTo(PreviewState.failed(DocumentPreview.describe(error)));
    }
  }

  /** 창을 닫고 임시 주소를 반납한다. */
  close(): void {
    this.releaseUrl();
    this.moveTo(PreviewState.closed());
  }

  /** 미리보기 상태가 바뀌는 것을 화면이 따라오게 한다. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 들고 있던 임시 주소를 반납한다. 없으면 아무 일도 하지 않는다. */
  private releaseUrl(): void {
    if (this.issuedUrl === null) return;
    this.links.revoke(this.issuedUrl);
    this.issuedUrl = null;
  }

  /** 상태를 바꾸고 화면에 알린다. */
  private moveTo(state: PreviewState): void {
    this.current = state;
    for (const listener of this.listeners) listener();
  }

  /** 호스트가 무엇을 던지든 사람이 읽을 수 있는 한 줄로 만든다. */
  private static describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
