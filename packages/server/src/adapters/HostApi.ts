/** 사이드카가 호스트 API에 닿는 데 필요한 설정이다. */
export interface HostApiOptions {
  /** 호스트가 report-tool 콜백을 열어 둔 자리다. 예: `https://hr.isu.co.kr/report-api`. */
  readonly baseUrl: string;

  /**
   * 호스트가 사이드카를 알아보는 데 쓰는 헤더다.
   *
   * 이 연결은 사내망 안이라도 **아무나 부를 수 있으면 안 된다** — 여기로 오는
   * 요청 하나가 남의 급여 데이터를 꺼낸다.
   */
  readonly headers?: Readonly<Record<string, string>>;

  /** 테스트가 네트워크 없이 계약만 확인할 수 있도록 주입받는다. */
  readonly fetch?: typeof fetch;
}

/**
 * 사이드카가 호스트 애플리케이션을 부르는 한 곳이다.
 *
 * 호스트가 Spring이든 Flask든 상관없다. 우리 쪽 요구는 REST 몇 개뿐이고, 그것을
 * 무엇으로 구현하는지는 호스트가 정한다. 라이브러리를 Java·Python으로 다시 만드는
 * 대신 **Node 사이드카 하나가 그 언어의 앱과 REST로 만난다.**
 *
 * 주소 이어 붙이기·인증 헤더·오류 옮기기를 어댑터마다 따로 하면 반드시 갈라진다.
 * 어떤 어댑터는 404를 조용히 삼키고 어떤 어댑터는 500으로 올리게 된다.
 */
export class HostApi {
  private readonly baseUrl: string;
  private readonly headers: Readonly<Record<string, string>>;
  private readonly fetchImpl: typeof fetch;

  /** 호스트 주소와 인증 헤더를 한 번만 정해 둔다. */
  constructor(options: HostApiOptions) {
    // 끝 슬래시를 지운다. 남기면 `https://host//templates`가 되어, 경로를
    // 정규화하지 않는 서버에서 404가 난다.
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.headers = options.headers ?? {};
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
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

  /** 바이트를 받아 온다. 미디어 타입도 함께 준다 — 그림은 형식을 알아야 임베딩된다. */
  async bytes(path: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
    const response = await this.send("GET", path);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      mediaType: (response.headers.get("Content-Type") ?? "").split(";")[0]?.trim() ?? "",
    };
  }

  /** 바이트를 올린다. */
  async putBytes(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.send("PUT", path, {
      headers: { "Content-Type": contentType },
      body: bytes as unknown as BodyInit,
    });
  }

  /**
   * 실제로 요청을 보내고 실패를 읽을 수 있는 말로 옮긴다.
   *
   * 404를 따로 가른다. "호스트가 고장 났다"와 "그런 문서가 없다"는 부르는 쪽이
   * 해야 할 일이 다르다 — 앞은 다시 시도할 일이고 뒤는 다시 시도해도 같다.
   */
  private async send(method: string, path: string, init?: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      ...init,
      headers: { ...this.headers, ...(init?.headers as Record<string, string> | undefined) },
    });
    if (response.status === 404) throw new Error(`호스트에 없다: ${path}`);
    if (!response.ok) {
      throw new Error(`호스트가 요청을 거절했다 (${response.status}): ${await response.text()}`);
    }
    return response;
  }

  /**
   * 경로 조각을 감싸되 슬래시는 살린다.
   *
   * 열쇠 전체를 `encodeURIComponent`로 감싸면 `/`가 `%2F`가 되고, 그것을 그대로
   * 받아 주지 않는 서버가 많다. 조각마다 감싸면 한글·공백이 들어간 열쇠도 안전하다.
   */
  static encodePath(value: string): string {
    return value.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  }
}
