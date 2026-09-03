import type { SignatureStroke } from "@report-tool/core";

/** 수신자가 보낼 서명 증거다. 인증 방법은 링크를 만든 쪽이 정한다. */
export interface SignatureSubmission {
  readonly strokes: readonly SignatureStroke[];
  readonly imagePng: string;
  readonly authMethod: "email_link" | "sms_otp" | "sso" | "none";
}

/** 서버가 돌려준 문서 하나다. */
export interface FetchedDocument {
  readonly pdfBytes: Uint8Array;
  readonly status: string;
}

/**
 * 뷰어가 report-tool **서버**를 부르는 유일한 지점이다.
 *
 * 라이브러리가 I/O를 하지 않는다는 원칙에 어긋나지 않는다. 그 원칙이 막는 것은
 * **호스트의 DB·스토리지**를 우리가 직접 건드리는 일이고, 여기서 부르는 것은
 * 우리가 정의한 공개 API다. 수신자 브라우저에서 서버를 부르지 않으면 서명받을
 * 방법이 없다.
 *
 * 실패를 삼키지 않는다. 상태 코드와 서버가 남긴 이유를 함께 올린다 — 만료된
 * 링크(401)와 빈 서명(422)은 수신자에게 전혀 다른 말을 해 줘야 한다.
 */
export class SigningApiClient {
  private readonly baseUrl: string;

  /**
   * 테스트가 네트워크 없이 계약만 확인할 수 있도록 fetch를 주입받는다.
   *
   * 기본값을 `globalThis.fetch`로 그냥 두면 안 된다. 속성에 담아 `this.fetchImpl(...)`로
   * 부르는 순간 수신자가 `window`가 아니라 이 객체가 되고, 브라우저는
   * `Illegal invocation`으로 거절한다. Node에서는 그냥 되기 때문에 단위 테스트로는
   * 드러나지 않는다 — 실제로 브라우저에 띄워 보고 찾았다.
   */
  constructor(
    baseUrl: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    // 끝 슬래시를 지운다. 남겨 두면 `/api//documents/view`가 되어, 서버가
    // 경로를 정규화하지 않는 경우 404가 난다.
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** 토큰으로 문서를 열고 PDF 바이트와 상태를 받는다. */
  async fetchDocument(token: string): Promise<FetchedDocument> {
    const url = `${this.baseUrl}/documents/view?token=${encodeURIComponent(token)}`;
    const body = await this.request(await this.fetchImpl(url));
    return {
      pdfBytes: SigningApiClient.toBytes(String(body["pdfBase64"] ?? "")),
      status: String(body["status"] ?? ""),
    };
  }

  /** 서명 흔적을 보내고 바뀐 문서 상태를 받는다. */
  async submitSignature(token: string, submission: SignatureSubmission): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}/documents/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...submission }),
    });
    return String((await this.request(response))["status"] ?? "");
  }

  /**
   * 응답을 본문으로 바꾸되, 거절이면 상태 코드와 이유를 함께 올린다.
   *
   * 이유를 버리면 수신자 화면에 "실패했습니다"밖에 띄울 수 없다. 그 말로는
   * 링크를 다시 받아야 하는지 서명을 다시 그려야 하는지 알 수 없다.
   */
  private async request(response: Response): Promise<Record<string, unknown>> {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`서버가 요청을 거절했다 (${response.status}): ${SigningApiClient.reasonOf(text)}`);
    }
    return JSON.parse(text) as Record<string, unknown>;
  }

  /** 서버가 `{ error }`로 답하면 그 말을, 아니면 본문을 그대로 쓴다. */
  private static reasonOf(text: string): string {
    try {
      const parsed = JSON.parse(text) as { error?: unknown };
      return typeof parsed.error === "string" ? parsed.error : text;
    } catch {
      return text;
    }
  }

  /** base64로 온 PDF를 그릴 수 있는 바이트로 되돌린다. */
  private static toBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }
}
