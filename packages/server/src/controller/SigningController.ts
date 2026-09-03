import { InvalidTokenError, type SigningService, type SignaturePayload } from "@report-tool/core";
import { JsonRequest } from "../infrastructure/JsonRequest.js";
import { JsonResponse } from "../infrastructure/JsonResponse.js";

/**
 * 수신자가 문서를 열고 서명하는 두 요청을 서비스 호출로 옮긴다.
 *
 * **문서 해시는 요청에서 받지 않는다.** 무엇에 서명했는지는 서버가 보관한 PDF가
 * 정한다(`SigningService`). 클라이언트가 보낸 해시를 믿으면, 다른 문서를 보여 주고
 * 원하는 해시에 서명받는 일이 가능해진다.
 */
export class SigningController {
  /** 열람과 서명이 같은 서비스를 쓰므로 하나만 받는다. */
  constructor(private readonly signingService: SigningService) {}

  /**
   * 토큰으로 문서를 열고 PDF를 함께 돌려준다.
   *
   * PDF를 그대로 보내지 않고 base64로 감싸 JSON에 담는 이유는, 응답 하나로 문서
   * 상태와 바이트를 같이 줄 수 있어서다. 뷰어가 요청을 두 번 보내면 그 사이에
   * 상태가 갈릴 수 있다.
   */
  async handleView(request: Request): Promise<Response> {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (token === "") return JsonResponse.badRequest("토큰이 없다");
    try {
      const { document, pdfBytes } = await this.signingService.view(
        token,
        request.headers.get("x-forwarded-for") ?? undefined,
        request.headers.get("user-agent") ?? undefined,
      );
      return JsonResponse.of({
        status: document.status,
        pdfBase64: SigningController.toBase64(pdfBytes),
      });
    } catch (error) {
      return JsonResponse.failed(error, SigningController.statusFor(error));
    }
  }

  /**
   * 서명 흔적을 접수한다.
   *
   * 토큰이 틀린 것(401)과 흔적이 비어 있는 것(422)을 나눈다. 둘을 같은 코드로
   * 답하면 서명 패드가 비어 있었을 뿐인 사람에게 "링크가 만료됐다"고 말하게 된다.
   */
  async handleSign(request: Request): Promise<Response> {
    const body = await JsonRequest.read(request);
    if (body === null) return JsonResponse.badRequest("본문을 JSON으로 읽을 수 없다");
    const missing = JsonRequest.missing(body, ["token", "authMethod"]);
    if (missing.length > 0) {
      return JsonResponse.badRequest(`필수 값이 없다: ${missing.join(", ")}`);
    }
    return this.sign(String(body["token"]), body, request);
  }

  /** 토큰 검증 실패와 서명 내용 문제를 다른 상태 코드로 나눈다. */
  private async sign(
    token: string,
    body: Readonly<Record<string, unknown>>,
    request: Request,
  ): Promise<Response> {
    try {
      const document = await this.signingService.sign(
        token,
        SigningController.toPayload(body, request),
      );
      return JsonResponse.of({ status: document.status });
    } catch (error) {
      return JsonResponse.failed(error, SigningController.statusFor(error));
    }
  }

  /** 요청 본문을 서비스가 받는 서명 증거로 옮긴다. */
  private static toPayload(
    body: Readonly<Record<string, unknown>>,
    request: Request,
  ): SignaturePayload {
    return {
      strokes: Array.isArray(body["strokes"])
        ? body["strokes"] as SignaturePayload["strokes"]
        : [],
      imagePng: typeof body["imagePng"] === "string" ? body["imagePng"] : "",
      authMethod: body["authMethod"] as SignaturePayload["authMethod"],
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    };
  }

  /**
   * 토큰 문제만 401로 답한다.
   *
   * 메시지로 판별하지 않는다. 호스트가 어떤 인증을 쓰든 실패는 그쪽 방식대로
   * 던져지므로(`jwt expired` 등), 메시지를 보면 호스트를 바꾸는 순간 만료된 링크가
   * 422로 답하게 된다. 종류는 `SigningService`가 정한다.
   */
  private static statusFor(error: unknown): number {
    return error instanceof InvalidTokenError ? 401 : 422;
  }

  /** 바이트를 JSON에 담을 수 있는 base64 문자열로 만든다. */
  private static toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
}
