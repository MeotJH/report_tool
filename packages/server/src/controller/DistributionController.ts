import type { DistributionService } from "@report-tool/core";
import { JsonRequest } from "../infrastructure/JsonRequest.js";
import { JsonResponse } from "../infrastructure/JsonResponse.js";

/**
 * `POST /documents/:id/link`를 링크 발급 서비스 호출로 옮긴다.
 *
 * 누구에게 발급할지는 요청이 정하지 않는다. **수신자는 발행된 문서에 이미 적혀
 * 있다.** 요청이 수신자를 정할 수 있게 두면, 링크 하나로 남의 급여명세서를 볼 수
 * 있게 된다.
 */
export class DistributionController {
  /** 링크 발급 하나만 알면 되므로 서비스 하나만 받는다. */
  constructor(private readonly distributionService: DistributionService) {}

  /** 경로의 문서 식별자로 토큰을 발급한다. 유효 기간은 선택이다. */
  async handle(request: Request, params: Readonly<Record<string, string>>): Promise<Response> {
    const documentId = params["id"] ?? "";
    if (documentId === "") return JsonResponse.badRequest("문서 식별자가 없다");
    const body = await JsonRequest.read(request);
    try {
      const token = await this.distributionService.createLink(
        documentId,
        DistributionController.ttlOf(body),
      );
      return JsonResponse.of({ token });
    } catch (error) {
      // 없는 문서·취소된 문서 모두 "지금 상태에서 말이 되지 않는 요청"이다.
      // 500으로 답하면 호출한 쪽은 서버가 고장 난 줄 알고 그대로 다시 시도한다.
      return JsonResponse.failed(error, 422);
    }
  }

  /** 유효 기간을 주지 않았으면 서비스 기본값을 쓰게 둔다. */
  private static ttlOf(body: Record<string, unknown> | null): number | undefined {
    const value = body?.["ttlSeconds"];
    return typeof value === "number" ? value : undefined;
  }
}
