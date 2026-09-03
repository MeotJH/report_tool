import type { IssuanceService } from "@report-tool/core";
import { JsonRequest } from "../infrastructure/JsonRequest.js";
import { JsonResponse } from "../infrastructure/JsonResponse.js";

/**
 * `POST /documents/issue`를 발행 서비스 호출로 옮긴다.
 *
 * **여기에 업무 규칙을 두지 않는다.** 무엇을 발행할 수 있는지, 무엇을 동결해야
 * 하는지는 `IssuanceService`가 정한다. 이 계층이 하는 일은 요청에서 값을 꺼내고
 * 결과를 상태 코드로 옮기는 것뿐이다. 규칙이 두 곳에 생기면 HTTP로 부를 때와
 * 직접 부를 때가 갈린다.
 */
export class IssuanceController {
  /** 발행 흐름 하나만 알면 되므로 서비스 하나만 받는다. */
  constructor(private readonly issuanceService: IssuanceService) {}

  /** 요청 본문의 세 값으로 발행하고 만들어진 문서를 알린다. */
  async handle(request: Request): Promise<Response> {
    const body = await JsonRequest.read(request);
    if (body === null) return JsonResponse.badRequest("본문을 JSON으로 읽을 수 없다");
    const missing = JsonRequest.missing(body, ["templateId", "recipientId", "issuedBy"]);
    if (missing.length > 0) {
      return JsonResponse.badRequest(`필수 값이 없다: ${missing.join(", ")}`);
    }
    return this.issue(body);
  }

  /**
   * 발행을 실행하고 실패는 422로 옮긴다.
   *
   * 500이 아닌 이유는, 여기서 나는 실패가 대부분 **요청이 지금 상태에서 말이 되지
   * 않는 것**이기 때문이다(초안 템플릿 발행 등). 500으로 답하면 호출한 쪽은 서버가
   * 고장 난 줄 알고 그대로 다시 시도한다.
   */
  private async issue(body: Readonly<Record<string, unknown>>): Promise<Response> {
    try {
      const document = await this.issuanceService.issue(
        String(body["templateId"]),
        String(body["recipientId"]),
        String(body["issuedBy"]),
      );
      return JsonResponse.of({ id: document.id, status: document.status }, 201);
    } catch (error) {
      return JsonResponse.failed(error, 422);
    }
  }
}
