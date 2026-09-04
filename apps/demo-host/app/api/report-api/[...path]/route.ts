import { TemplateFactory, type Template } from "@report-tool/core";
import { TemplateContractReader } from "../../../../lib/templateContract";
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
  if (area === "templates" && first !== undefined && second === "contract") {
    return getContract(store, first);
  }
  if (area === "templates" && first !== undefined) {
    return getTemplate(store, first, new URL(request.url).searchParams.get("version") ?? undefined);
  }
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
  if (area === "templates" && first !== undefined && second === "unpublish") {
    return unpublishTemplate(store, first);
  }
  if (area === "templates" && first !== undefined && second === "next-version") {
    return nextVersion(store, first);
  }
  return notFound();
}

/** 담당자가 양식을 지운다. 포트에 없는 기능이라 호스트가 자기 방식으로 둔다. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const store = HostStore.shared();
  const [area, first] = (await context.params).path;
  if (area !== "templates" || first === undefined) return notFound();
  const id = decodeURIComponent(first);
  // 조용히 성공하지 않는다. 없는 것을 지웠다고 답하면 화면은 목록에서 없애고,
  // 다음에 열면 다시 나타난다.
  if (!store.removeTemplate(id)) return notFound();
  return json({});
}

/** 편집기의 "열기" 목록이다. */
function listTemplates(store: HostStore): Response {
  // 저장 JSON에서 목록에 필요한 것만 뽑는다. 실제 호스트라면
  // `SELECT id, name, status, version, updated_at FROM templates` 한 줄이다.
  return json(store.latestTemplates().map((saved) => ({
    id: saved["id"],
    name: saved["name"],
    updatedAt: saved["updatedAt"],
    status: saved["status"],
    version: saved["version"],
  })));
}

/** 편집기가 열 때도, 사이드카가 발행할 때도 이 자리를 읽는다. */
function getTemplate(store: HostStore, id: string, version?: string): Response {
  // 판을 지정하면 그 판을 준다. 발행된 문서는 자기가 만들어진 판을 되찾아야 한다.
  const wanted = version === undefined ? undefined : Number(version);
  const saved = wanted === undefined
    ? store.latestTemplate(decodeURIComponent(id))
    : store.templateAt(decodeURIComponent(id), wanted);
  return saved === undefined ? notFound() : json(saved);
}

/** 편집기가 저장한다. 판이 이미 있으면 덮어쓴다. */
async function saveTemplate(store: HostStore, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  let template;
  try {
    template = TemplateFactory.fromJSON(body);
  } catch (error) {
    // 이유를 삼키면 저장 실패가 500 한 줄로만 보인다. 필드 이름 하나가 틀린 것과
    // 서버가 죽은 것을 담당자도 개발자도 구분할 수 없다.
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
  // 되살려 본 뒤 다시 JSON으로 담는다. 되살리기가 곧 검증이고, 담기는 것은
  // 언제나 `toJSON()`이 만든 하나의 형식이다.
  store.saveTemplate(template.toJSON());
  return json({});
}

/**
 * 담당자가 "이제 이 양식으로 발행해도 된다"고 표시한다.
 *
 * 사이드카는 `published`가 아닌 양식의 발행을 거절한다. 만들다 만 양식이 직원에게
 * 나가는 것을 막는 자리다.
 */
function publishTemplate(store: HostStore, id: string): Response {
  const template = load(store, decodeURIComponent(id));
  if (template === null) return notFound();
  store.saveTemplate(template.publish().toJSON());
  return json({ status: "published", version: template.version });
}

/** 저장 JSON을 이 라우트의 클래스로 되살린다. 없으면 `null`이다. */
function load(store: HostStore, id: string): Template | null {
  const saved = store.latestTemplate(id);
  return saved === undefined ? null : TemplateFactory.fromJSON(saved);
}

/**
 * 이 양식이 호스트에게 무엇을 요구하는지 알려 준다.
 *
 * **호스트 백엔드 개발자가 읽는 자리다.** 양식을 만드는 사람과 데이터를 주는
 * 사람은 보통 다른 팀이고 서로 말하지 않고 일한다. 양식에 칸이 하나 늘었을 때
 * 그것을 알 방법이 없으면, 그 칸은 빈칸으로 발행되고 아무 오류도 나지 않는다.
 */
async function getContract(store: HostStore, id: string): Promise<Response> {
  const template = load(store, decodeURIComponent(id));
  if (template === null) return notFound();
  const sample = await employees.sample(template.id).catch(() => ({}));
  return json(new TemplateContractReader().read(template, sample));
}

/**
 * 발행 표시를 되돌려 다시 고칠 수 있게 한다.
 *
 * **이 양식으로 발행한 문서가 있으면 거절한다.** 발행본은 자기가 어느 판을
 * 근거로 만들어졌는지 가리키고 있다. 그 판이 다시 편집 가능해지면 "무엇에
 * 서명했는가"에 답할 수 없게 된다. 그때는 되돌리는 대신 새 버전을 만든다.
 *
 * 도메인에 `unpublish`가 없는 것은 실수가 아니다. 되돌릴지 말지는 발행 이력을
 * 아는 쪽만 판단할 수 있고, 그것은 호스트다.
 */
function unpublishTemplate(store: HostStore, id: string): Response {
  const templateId = decodeURIComponent(id);
  const template = load(store, templateId);
  if (template === null) return notFound();
  if (store.hasDocumentsFrom(templateId, template.version)) {
    return json({
      error: "이미 발행한 문서가 있어 되돌릴 수 없습니다. 새 버전을 만드세요.",
    }, 409);
  }
  store.saveTemplate({ ...template.toJSON(), status: "draft" });
  return json({ status: "draft" });
}

/** 발행본은 그대로 두고 편집 가능한 다음 판을 시작한다. */
function nextVersion(store: HostStore, id: string): Response {
  const template = load(store, decodeURIComponent(id));
  if (template === null) return notFound();
  const next = template.createNextVersion();
  store.saveTemplate(next.toJSON());
  return json({ version: next.version, status: next.status });
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
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** 없다고 답한다. 사이드카는 이것을 "호스트에 없다"로 읽는다. */
function notFound(): Response {
  return new Response("", { status: 404 });
}
