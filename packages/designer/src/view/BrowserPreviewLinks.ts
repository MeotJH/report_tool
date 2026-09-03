import type { PreviewLinkFactory } from "../controller/DocumentPreview.js";

/**
 * PDF 바이트를 브라우저가 그대로 띄울 수 있는 임시 주소로 만든다.
 *
 * `blob:` 주소를 쓰는 이유는 base64 문자열로 만들면 큰 문서에서 메모리를 두 배로
 * 쓰고, 주소 길이 제한에도 걸리기 때문이다.
 *
 * 반납(`revoke`)을 잊으면 창을 닫아도 그 문서가 메모리에 남는다. 열 때마다 새
 * 주소가 생기므로, 미리보기를 열 번 열면 문서 열 개가 그대로 쌓인다.
 */
export class BrowserPreviewLinks implements PreviewLinkFactory {
  /** 이 창에서만 유효한 PDF 주소를 만든다. */
  create(bytes: Uint8Array): string {
    return URL.createObjectURL(
      new Blob([BrowserPreviewLinks.toArrayBuffer(bytes)], { type: "application/pdf" }),
    );
  }

  /** 다 쓴 주소를 브라우저에 돌려준다. */
  revoke(url: string): void {
    URL.revokeObjectURL(url);
  }

  /** 뷰가 가리키는 구간만 정확히 넘겨 다른 데이터가 섞이지 않게 한다. */
  private static toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  }
}
