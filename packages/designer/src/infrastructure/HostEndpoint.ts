/**
 * 편집기가 호스트 앱의 API를 부르는 한 곳이다.
 *
 * 편집기는 호스트 페이지 안에서 돈다. 그래서 부르는 상대는 사이드카가 아니라
 * **호스트 자신**이고, 대개 같은 출처라 인증도 호스트의 세션 쿠키가 그대로 쓰인다.
 *
 * 사이드카 쪽 `HostApi`와 모양이 닮았지만 따로 둔다. 방향이 반대이고(사이드카→호스트
 * 대 브라우저→호스트), 무엇보다 그것은 Node 패키지에 있다 — 편집기 번들에 끌어오면
 * Node 타입과 사이드카 조립부까지 함께 딸려 온다. 여기 있는 것은 판단이 아니라
 * 주소 잇기·오류 옮기기뿐이다.
 */
export class HostEndpoint {
  private readonly baseUrl: string;

  /** 호스트가 report-tool API를 열어 둔 자리를 받는다. 예: `/report-api`. */
  constructor(baseUrl: string, private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)) {
    // 끝 슬래시를 지운다. 남기면 `/report-api//templates`가 되어, 경로를
    // 정규화하지 않는 서버에서 404가 난다.
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** JSON을 주고받는다. 본문이 없으면 보내지 않는다. */
  async json(method: string, path: string, body?: unknown): Promise<unknown> {
    const response = await this.send(method, path, body === undefined ? undefined : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return text === "" ? undefined : JSON.parse(text);
  }

  /** 바이트를 받아 온다. 미디어 타입도 함께 준다 — 그림은 형식을 알아야 그릴 수 있다. */
  async bytes(path: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
    const response = await this.send("GET", path);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      mediaType: (response.headers.get("Content-Type") ?? "").split(";")[0]?.trim() ?? "",
    };
  }

  /** 바이트를 올리고 호스트가 준 JSON을 받는다. */
  async postBytes(path: string, bytes: Uint8Array, contentType: string): Promise<unknown> {
    const response = await this.send("POST", path, {
      headers: { "Content-Type": contentType },
      body: bytes as unknown as BodyInit,
    });
    const text = await response.text();
    return text === "" ? undefined : JSON.parse(text);
  }

  /**
   * 요청을 보내고 실패를 사람이 읽을 수 있는 말로 옮긴다.
   *
   * 이 말이 그대로 담당자 화면에 뜬다(`SaveState.failed`). "실패했습니다"로는
   * 다시 눌러야 하는지 로그인을 다시 해야 하는지 알 수 없다.
   */
  private async send(method: string, path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, { method, ...init });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`호스트에 닿지 못했다 (${method} ${url}): ${reason}`);
    }
    if (!response.ok) {
      throw new Error(`호스트가 요청을 거절했다 (${response.status}): ${await response.text()}`);
    }
    return response;
  }

  /**
   * 경로 조각을 감싸되 슬래시는 살린다.
   *
   * 담당자가 지은 양식 이름이 식별자가 되는 경우가 있어 한글·공백이 들어온다.
   */
  static encodePath(value: string): string {
    return value.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  }
}
