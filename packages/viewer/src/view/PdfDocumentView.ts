import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

/**
 * 서버가 만든 발행본을 화면에 **그대로** 그린다.
 *
 * 여기서 PDF를 다시 만들지 않는다. 받은 바이트를 그리기만 한다. 수신자가 보는
 * 것과 해시가 걸린 파일이 같아야 "무엇에 서명했는가"가 성립한다 — 뷰어가 조금이라도
 * 다시 그리면 그 순간 서명 대상이 갈린다.
 *
 * 브라우저 기본 PDF 뷰어(`iframe`)를 쓰지 않는 이유는 셋이다. 내려받기·인쇄 같은
 * 남의 버튼이 함께 뜨고, 서명칸과 한 화면에 짜 넣을 수 없으며, iOS Safari에서
 * `blob:` PDF가 열리지 않는 경우가 있다. 편집기 미리보기와 판단이 다른 것은
 * 상황이 다르기 때문이다 — 그쪽은 만든 사람이 데스크톱에서 확인하는 자리다.
 */
export class PdfDocumentView {
  /** 화면 너비에 맞춰 그리되, 너무 잘게 그리지 않도록 최소 배율을 둔다. */
  private static readonly MINIMUM_SCALE = 0.5;

  /** 쪽마다 캔버스 하나를 만들어 넣을 자리를 받는다. */
  constructor(private readonly container: HTMLElement) {}

  /**
   * pdf.js가 쓸 작업자 파일 위치를 정한다.
   *
   * 호스트가 어떤 번들러를 쓰는지 우리가 알 수 없으므로 주소를 받는다. 주지 않으면
   * pdf.js는 본 스레드에서 해석하는데, 10쪽짜리 문서에서는 그동안 화면이 멈춘다.
   */
  static useWorker(workerSrc: string): void {
    GlobalWorkerOptions.workerSrc = workerSrc;
  }

  /** 받은 바이트를 쪽마다 캔버스로 그리고 쪽 수를 알려 준다. */
  async show(pdfBytes: Uint8Array): Promise<number> {
    // pdf.js는 넘긴 배열의 소유권을 가져가 비워 버린다. 호출한 쪽이 같은 바이트를
    // 다시 쓰려 할 때(다시 그리기·해시 확인) 빈 배열을 보게 되므로 사본을 준다.
    const document = await getDocument({ data: pdfBytes.slice() }).promise;
    this.container.replaceChildren();
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      await this.drawPage(document, pageNumber);
    }
    return document.numPages;
  }

  /** 쪽 하나를 컨테이너 너비에 맞춰 그린다. */
  private async drawPage(
    document: Awaited<ReturnType<typeof getDocument>["promise"]>,
    pageNumber: number,
  ): Promise<void> {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: this.scaleFor(page.getViewport({ scale: 1 }).width) });
    const canvas = window.document.createElement("canvas");
    canvas.className = "rt-viewer-page";
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    this.container.append(canvas);
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("캔버스 2D 컨텍스트를 얻지 못했다");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
  }

  /** 컨테이너 너비에 맞춘 배율이다. 너비를 아직 모르면 원래 크기로 그린다. */
  private scaleFor(naturalWidth: number): number {
    const available = this.container.clientWidth;
    if (available <= 0) return 1;
    return Math.max(PdfDocumentView.MINIMUM_SCALE, available / naturalWidth);
  }
}
