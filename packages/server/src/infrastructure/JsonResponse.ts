/**
 * 모든 응답이 같은 모양을 갖게 한다.
 *
 * 성공은 그대로, 실패는 `{ error }` 하나로 통일한다. 컨트롤러마다 오류 모양이
 * 다르면 호출하는 쪽이 엔드포인트마다 다른 처리를 짜야 한다.
 */
export class JsonResponse {
  /** 본문과 상태 코드를 JSON 응답으로 만든다. */
  static of(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  /** 요청 자체가 잘못된 경우다. 고쳐서 다시 보내면 된다. */
  static badRequest(message: string): Response {
    return JsonResponse.of({ error: message }, 400);
  }

  /**
   * 서비스가 던진 예외를 상태 코드로 옮긴다. 이유는 그대로 전한다.
   *
   * 짐작한 말로 바꾸면 호출하는 쪽이 원인을 찾을 수 없다. 예외 메시지는 우리가
   * 쓴 것이므로 그대로 내보내도 내부 구조가 새지 않는다.
   */
  static failed(error: unknown, status: number): Response {
    return JsonResponse.of(
      { error: error instanceof Error ? error.message : String(error) },
      status,
    );
  }
}
