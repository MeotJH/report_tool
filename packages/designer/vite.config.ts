import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";

/**
 * 플레이그라운드가 부를 발행 렌더 엔드포인트를 개발 서버에 붙인다.
 *
 * **호스트가 해야 할 일을 그대로 흉내 낸 것이다.** 발행 렌더러는 브라우저에서
 * 돌지 않으므로(`발행본 렌더는 서버에서만 허용된다`), 미리보기도 서버가 만들어야
 * 한다. 편집기는 `DocumentRenderer` 포트만 알고, 그것이 fetch인지 사내 API인지는
 * 모른다.
 *
 * 그림을 요청과 함께 받는 이유는, 브라우저 보관소에 올린 로고를 Node가 볼 수 없기
 * 때문이다. 실제 호스트라면 서버가 같은 보관소를 읽으므로 이 자리는 사라진다.
 */
function previewEndpoint(): Plugin {
  return {
    name: "report-tool-preview",
    configureServer(server) {
      server.middlewares.use("/__preview", (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }
        void renderPreview(request, response);
      });
    },
  };
}

/**
 * 데모용 report-tool 서버를 개발 서버에 붙인다.
 *
 * `apps/admin`의 참조 어댑터와 `createMiddleware`를 그대로 쓴다. **호스트가 할 일이
 * 이게 전부라는 것을 보여 주는 자리**이므로, 여기서 지름길을 쓰면 본보기가 아니게
 * 된다. 실제 서비스라면 이 미들웨어가 Next.js 라우트 하나에 붙는다.
 */
function demoApiEndpoint(): Plugin {
  let handler: ((request: Request) => Promise<Response>) | null = null;
  return {
    name: "report-tool-demo-api",
    configureServer(server) {
      server.middlewares.use("/api/report", (request, response) => {
        void serveDemoApi(request, response, async () => (handler ??= await createDemoHandler()));
      });
    },
  };
}

/** Node 요청을 표준 `Request`로 바꿔 미들웨어에 넘기고, 응답을 되돌려 쓴다. */
async function serveDemoApi(
  request: IncomingMessage,
  response: ServerResponse,
  handlerOf: () => Promise<(request: Request) => Promise<Response>>,
): Promise<void> {
  try {
    const method = request.method ?? "GET";
    const url = new URL(`http://localhost/api/report${request.url ?? ""}`);
    const body = method === "GET" || method === "HEAD" ? undefined : await readBody(request);
    const result = await (await handlerOf())(new Request(url, { method, body }));
    response.statusCode = result.status;
    result.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : String(error));
  }
}

/** 참조 어댑터를 꽂아 완성된 요청 핸들러를 만든다. 서버 하나가 이 열 줄이다. */
async function createDemoHandler(): Promise<(request: Request) => Promise<Response>> {
  const admin = await import("@report-tool/admin");
  const { createMiddleware } = await import("@report-tool/server");
  const { PdfDocumentRenderer } = await import("@report-tool/renderer");
  const templateStore = new admin.InMemoryTemplateStore();
  await templateStore.save(admin.createDemoTemplate());
  await templateStore.publish("demo-payslip", 1);
  const fontDir = new URL(
    "../../node_modules/pretendard/dist/public/static/alternative/",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  return createMiddleware({
    templateStore,
    documentStore: new admin.InMemoryDocumentStore(),
    dataProvider: new admin.StaticJsonDataProvider(),
    storage: new admin.FileSystemStorageAdapter(
      new URL("../../.demo-storage/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    ),
    authAdapter: new admin.TokenAuthAdapter("데모-비밀열쇠"),
    renderer: new PdfDocumentRenderer(new admin.NodeFontProvider(fontDir)),
    hashProvider: new admin.NodeCryptoHashProvider(),
  }, { basePath: "/api/report" });
}

/** 요청 본문의 템플릿·데이터·그림으로 미리보기 PDF를 만들어 돌려준다. */
async function renderPreview(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const { TemplateFactory } = await import("@report-tool/core");
    const { PdfDocumentRenderer } = await import("@report-tool/renderer");
    const payload = JSON.parse(await readBody(request)) as PreviewRequest;
    const bytes = await new PdfDocumentRenderer(
      new FilesystemFontProvider(),
      new PostedImageProvider(payload.images ?? {}),
    ).render(TemplateFactory.fromJSON(payload.template), payload.data, "preview");
    response.setHeader("Content-Type", "application/pdf");
    response.end(Buffer.from(bytes));
  } catch (error) {
    // 실패 이유를 그대로 돌려준다. 편집기가 그 말을 사람에게 보여 준다.
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : String(error));
  }
}

/** 편집기가 보내는 미리보기 요청의 모양이다. */
interface PreviewRequest {
  readonly template: Record<string, unknown>;
  readonly data: unknown;
  readonly images?: Record<string, { base64: string; mediaType: "image/png" | "image/jpeg" }>;
}

/** 스트림으로 오는 본문을 한 문자열로 모은다. */
async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

/** 발행본이 임베딩할 글꼴 파일을 디스크에서 읽는다. 화면과 같은 파일이어야 한다. */
class FilesystemFontProvider {
  /** 리포트는 맑은 고딕을, 나머지는 Pretendard를 쓴다(플레이그라운드와 같다). */
  async load(family: string, weight: number): Promise<Uint8Array> {
    const bold = weight >= 700;
    const path = family === "MalgunGothic"
      ? (bold ? "C:/Windows/Fonts/malgunbd.ttf" : "C:/Windows/Fonts/malgun.ttf")
      : new URL(
        `../../node_modules/pretendard/dist/public/static/alternative/Pretendard-${bold ? "Bold" : "Regular"}.ttf`,
        import.meta.url,
      );
    return new Uint8Array(readFileSync(path));
  }
}

/** 편집기가 함께 보낸 그림을 발행 렌더러가 쓰는 형태로 돌려준다. */
class PostedImageProvider {
  /** 요청 하나 동안만 유효한 그림 목록이다. */
  constructor(
    private readonly images: Record<string, { base64: string; mediaType: "image/png" | "image/jpeg" }>,
  ) {}

  /** 보내지 않은 자산은 이유를 밝히고 실패한다. 조용히 빈칸으로 두지 않는다. */
  async load(assetId: string): Promise<{ bytes: Uint8Array; mediaType: "image/png" | "image/jpeg" }> {
    const found = this.images[assetId];
    if (found === undefined) throw new Error(`미리보기 요청에 그림 ${assetId}가 없다`);
    return { bytes: new Uint8Array(Buffer.from(found.base64, "base64")), mediaType: found.mediaType };
  }
}

/** React 호스트가 기존 런타임을 재사용하는 ESM 라이브러리 산출물을 만든다. */
export default defineConfig({
  plugins: [previewEndpoint(), demoApiEndpoint()],
  // 개발 서버 포트는 호스트 환경이 정할 수 있게 둔다. 5173이 이미 쓰이는
  // 상황(다른 세션·다른 프로젝트)에서 편집기를 못 띄우는 일을 막는다.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    lib: {
      entry: new URL("./src/index.ts", import.meta.url).pathname,
      formats: ["es"],
      fileName: () => "designer.esm.js",
    },
    rollupOptions: {
      external: [
        "@report-tool/core",
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
      ],
    },
  },
});
