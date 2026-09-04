import { TemplateFactory } from "@report-tool/core";
import { StaticJsonDataProvider } from "@report-tool/admin";
// 별칭(`@/…`) 대신 상대 경로를 쓴다. Next가 이 저장소의 TypeScript 7로는
// tsconfig의 `paths`를 읽지 못한다.
import { HostStore } from "../../../../lib/hostStore";

/**
 * 호스트 앱이 report-tool에 열어 주는 자리다.
 *
 * **두 쪽이 함께 쓴다.** 편집기(브라우저)가 양식을 저장하고, 사이드카(서버)가 발행할
 * 때 그것을 읽는다. 두 경로를 따로 두면 담당자가 저장한 양식과 발행이 읽는 양식이
 * 갈라지고, 그 어긋남은 "발행만 안 된다"로 나타나 원인을 짚기 어렵다.
 *
 * 계약은 [docs/HOST_API.md](../../../../../../docs/HOST_API.md)에 있다. 실제 호스트는
 * 이 파일이 하는 일을 자기 언어(Spring·Flask)로 구현한다.
 *
 * **인증이 없다.** 데모이기 때문이다. 실제로는 사이드카가 보내는 인증 헤더를 여기서
 * 확인해야 한다 — 이 자리로 오는 요청 하나가 남의 급여 데이터를 꺼낸다.
 */

/** 데모 명단은 참조 어댑터의 가짜 직원을 그대로 쓴다. */
const employees = new StaticJsonDataProvider();

/** 사이드카와 편집기가 부르는 모든 GET을 처리한다. */
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const store = HostStore.shared();
  const path = (await context.params).path;
  const [area, first, second] = path;

  if (area === "templates" && first === undefined) return listTemplates(store);
  if (area === "templates" && first !== undefined) return getTemplate(store, first);
  if (area === "data" && first !== undefined && second !== undefined) {
    return getData(first, second);
  }
  if (area === "images" && first !== undefined) return getImage(store, first);
  if (area === "files") return getFile(store, path.slice(1).join("/"));
  if (area === "documents" && first !== undefined) return getDocument(store, first);
  return notFound();
}

/** 편집기의 저장과 사이드카의 문서 갱신을 처리한다. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const store = HostStore.shared();
  const path = (await context.params).path;
  const [area, first] = path;

  if (area === "templates" && first !== undefined) return saveTemplate(store, request);
  if (area === "documents" && first !== undefined) return updateDocument(store, first, request);
  if (area === "files") return putFile(store, path.slice(1).join("/"), request);
  return notFound();
}

/** 편집기의 그림 올리기, 담당자의 발행 표시, 사이드카의 문서 만들기를 처리한다. */
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const store = HostStore.shared();
  const [area, first, second] = (await context.params).path;

  if (area === "images") return uploadImage(store, request);
  if (area === "documents" && first === undefined) return createDocument(store, request);
  if (area === "templates" && first !== undefined && second === "publish") {
    return publishTemplate(store, first);
  }
  return notFound();
}

/** 편집기의 "열기" 목록이다. */
async function listTemplates(store: HostStore): Promise<Response> {
  const summaries = await Promise.all(
    [...store.templateIds].map(async (id) => {
      const template = await store.templates.get(id);
      return {
        id: template.id,
        name: template.name,
        updatedAt: template.updatedAt,
        status: template.status,
      };
    }),
  );
  return json(summaries);
}

/** 편집기가 열 때도, 사이드카가 발행할 때도 이 자리를 읽는다. */
async function getTemplate(store: HostStore, id: string): Promise<Response> {
  try {
    return json((await store.templates.get(decodeURIComponent(id))).toJSON());
  } catch {
    return notFound();
  }
}

/** 편집기가 저장한다. 판이 이미 있으면 덮어쓴다. */
async function saveTemplate(store: HostStore, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const template = TemplateFactory.fromJSON(body);
  await store.templates.save(template);
  store.templateIds.add(template.id);
  return json({});
}

/**
 * 담당자가 "이제 이 양식으로 발행해도 된다"고 표시한다.
 *
 * 사이드카는 `published`가 아닌 양식의 발행을 거절한다. 만들다 만 양식이 직원에게
 * 나가는 것을 막는 자리다.
 */
async function publishTemplate(store: HostStore, id: string): Promise<Response> {
  const template = await store.templates.get(decodeURIComponent(id));
  await store.templates.publish(template.id, template.version);
  return json({ status: "published", version: template.version });
}

/** 사이드카가 발행할 때 읽는 급여 데이터다. 누구 것을 줄지는 호스트가 정한다. */
async function getData(templateId: string, recipientId: string): Promise<Response> {
  try {
    return json(recipientId === "sample"
      ? await employees.sample(templateId)
      : await employees.resolve(templateId, decodeURIComponent(recipientId)));
  } catch {
    return notFound();
  }
}

/** 편집기가 로고·직인을 올린다. 식별자는 호스트가 정한다. */
async function uploadImage(store: HostStore, request: Request): Promise<Response> {
  const name = new URL(request.url).searchParams.get("name") ?? "image.png";
  const mediaType = request.headers.get("Content-Type") ?? "image/png";
  const bytes = new Uint8Array(await request.arrayBuffer());
  // 같은 이름을 다시 올리면 덮어쓴다. 무작위 식별자를 붙이면 같은 로고를 두 번
  // 올린 사람이 어느 것이 쓰이는지 구별할 수 없다.
  store.images.set(name, { bytes, mediaType });
  return json({ assetId: name });
}

/** 편집기가 그리고, 사이드카가 발행본에 임베딩할 때 읽는다. */
function getImage(store: HostStore, assetId: string): Response {
  const found = store.images.get(decodeURIComponent(assetId));
  if (found === undefined) return notFound();
  return new Response(toBody(found.bytes), { headers: { "Content-Type": found.mediaType } });
}

/**
 * 사이드카가 만든 발행본 PDF를 받는다.
 *
 * **받은 바이트를 한 바이트도 바꾸지 않는다.** 그 파일의 SHA-256이 "무엇에
 * 서명했는가"의 근거다.
 */
async function putFile(store: HostStore, key: string, request: Request): Promise<Response> {
  store.files.set(decodeURIComponent(key), new Uint8Array(await request.arrayBuffer()));
  return json({});
}

/** 수신자가 문서를 열 때 사이드카가 이 자리에서 되읽는다. */
function getFile(store: HostStore, key: string): Response {
  const bytes = store.files.get(decodeURIComponent(key));
  if (bytes === undefined) return notFound();
  return new Response(toBody(bytes), { headers: { "Content-Type": "application/pdf" } });
}

/** 사이드카가 발행 기록을 남긴다. JSON 그대로 담아 둔다. */
async function createDocument(store: HostStore, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  store.documents.set(String(body["id"]), body);
  return json({});
}

/**
 * 사이드카가 발행 기록을 되읽는다.
 *
 * 링크를 발급할 때도, 수신자가 문서를 열 때도, 서명을 받을 때도 매번 이 자리를
 * 읽는다. 사이드카가 아무것도 들고 있지 않기 때문이다 — 문서의 지금 상태를 아는
 * 곳은 호스트뿐이다.
 */
function getDocument(store: HostStore, id: string): Response {
  const found = store.documents.get(decodeURIComponent(id));
  if (found === undefined) return notFound();
  return json(found);
}

/**
 * 상태가 바뀐 문서로 덮어쓴다.
 *
 * **없는 문서를 만들어 주지 않는다.** 만들어 주면 사이드카 쪽 버그가 조용히 새
 * 문서를 만든다.
 */
async function updateDocument(
  store: HostStore,
  id: string,
  request: Request,
): Promise<Response> {
  const key = decodeURIComponent(id);
  if (!store.documents.has(key)) return notFound();
  store.documents.set(key, await request.json() as Record<string, unknown>);
  return json({});
}

/**
 * 바이트를 응답 본문으로 만든다.
 *
 * `Uint8Array`를 그대로 넘기면 타입이 맞지 않는다. 사본의 버퍼를 넘겨 저장해 둔
 * 원본이 응답과 함께 넘어가지 않게 한다.
 */
function toBody(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

/** JSON으로 답한다. */
function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

/** 없다고 답한다. 사이드카는 이것을 "호스트에 없다"로 읽는다. */
function notFound(): Response {
  return new Response("", { status: 404 });
}
