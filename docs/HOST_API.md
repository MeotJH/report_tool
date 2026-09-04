# 호스트가 구현할 REST 계약

호스트 앱이 **Node가 아닐 때**(Spring · Flask · ASP.NET 등) 쓰는 방식이다.
Node 호스트라면 이 문서가 필요 없다 — 어댑터를 TypeScript 클래스로 직접 구현하면 된다
([ARCHITECTURE.md](ARCHITECTURE.md) 참고).

---

## 왜 이렇게 하는가

발행본 PDF를 만들려면 harfbuzz로 서브셋한 글꼴을 pdf-lib로 임베딩해야 한다.
이것은 이 저장소가 실패를 겪고 확정한 제약이고([CLAUDE.md](../CLAUDE.md)), Java나
Python으로 다시 만드는 것은 **새 프로젝트 하나**다.

그래서 호스트 앱은 그대로 두고 **Node 사이드카 한 대**를 옆에 세운다.

```
[호스트 앱 (Spring/Flask)]  ← 직원·급여 DB, 로그인, 화면
      │  ① 발행해 줘 / 링크 줘             ↑ ② 데이터 줘 / 이거 저장해 줘
      ▼                                    │
[Node 사이드카]  ← @report-tool/server + renderer
```

- **①** 호스트가 사이드카를 부른다 → [발행 API](#사이드카가-여는-api)
- **②** 사이드카가 호스트를 되부른다 → **이 문서가 정의하는 것**

사이드카는 아무것도 오래 들고 있지 않는다. 급여 DB도, 파일 저장소도, 로그인도
모른다. 그래서 사이드카가 뚫려도 거기서 새어 나갈 데이터가 없다.

---

## 호스트가 구현할 엔드포인트 (6개)

모든 요청에 사이드카가 설정한 인증 헤더가 붙는다(`SidecarConfig.host.headers`).
**이 자리를 열어 두면 안 된다** — 여기로 오는 요청 하나가 남의 급여 데이터를 꺼낸다.

응답이 `404`면 사이드카는 "없다"로, 그 밖의 실패는 "호스트가 거절했다"로 다룬다.
둘은 부르는 쪽이 할 일이 다르다 — 앞은 다시 시도해도 같고, 뒤는 다시 시도할 일이다.

### 1. 발행할 양식 주기

```
GET {base}/templates/{templateId}?version={n}
→ 200  application/json  (편집기가 저장한 템플릿 JSON 그대로)
```

`version`이 없으면 호스트가 정한다(보통 최신 발행판). **`status`가 `published`가
아니면 사이드카가 발행을 거절한다** — 만들다 만 양식이 직원에게 나가는 것을 막는 자리다.

### 2. 발행할 데이터 주기

```
GET {base}/data/{templateId}/{recipientId}
→ 200  application/json  (양식이 읽는 모양 그대로)

GET {base}/data/{templateId}/sample
→ 200  application/json  (미리보기용 표본 — 개인 식별 값은 가려서)
```

둘을 나눈 이유는 **표본은 아무나 보는 화면에 쓰이기 때문**이다. 주민등록번호 같은
값을 가리는 판단은 호스트가 한다. 하나로 합치면 그 판단이 호출부로 넘어가고, 한 번만
틀려도 평문이 화면에 뜬다.

여기서 **누구의 데이터를 내줄지 정하는 것도 호스트다.** 사이드카는 권한을 모른다.

### 3. 발행본 PDF 넣고 빼기

```
PUT {base}/files/{key}      body: PDF 바이트   Content-Type: application/pdf
→ 200

GET {base}/files/{key}
→ 200  application/pdf  (넣은 바이트 그대로)
```

`key`는 사이드카가 정한다(`documents/{템플릿}/{수신자}/{시각}.pdf`). 경로 조각마다
URL 인코딩되어 오고 **슬래시는 살아 있다**.

**받은 바이트를 한 바이트도 바꾸지 말 것.** 그 파일의 SHA-256이 "무엇에 서명했는가"의
근거다. 압축·워터마크·메타데이터 추가 전부 서명을 깬다.

### 4. 발행 문서 기록 넣고 빼기

```
POST {base}/documents           body: 발행 문서 JSON
→ 200

GET  {base}/documents/{id}
→ 200  application/json  (넣은 것 그대로)

PUT  {base}/documents/{id}      body: 발행 문서 JSON
→ 200
```

발행 문서 JSON은 `schemaVersion`·상태·서명 기록·감사 로그를 담은 객체다.
**통째로 그대로 저장하고 그대로 돌려주면 된다.** 안을 뜯어 컬럼으로 나눠도 되지만,
그러면 되돌릴 때 빠짐없이 복원해야 한다 — 서명 좌표 하나가 빠지면 몇 년 뒤 그 서명을
다시 그릴 수 없다.

```jsonc
{
  "schemaVersion": 1,
  "id": "…", "templateId": "…", "templateVersion": 2, "recipientId": "…",
  "status": "issued | viewed | signed | voided",
  "dataSnapshot": { /* 발행 당시 데이터 — 나중에 재현의 근거 */ },
  "pdf": { "storageKey": "…", "sha256": "64자 hex", "bytes": 12345 },
  "issuedAt": "…", "issuedBy": "…",
  "signatures": [ /* 서명 좌표·이미지·인증 방법·문서 해시 */ ],
  "auditLog":  [ /* 언제 누가 무엇을 했는가 */ ]
}
```

`PUT`은 상태가 바뀔 때마다 온다(열람 → `viewed`, 서명 → `signed`). **이미 있는 문서만
갱신하고, 없으면 404로 답할 것.** 없는 문서를 만들어 주면 사이드카 쪽 버그가 조용히
새 문서를 만든다.

### 5. 로고·직인 주기 (양식에 그림이 있을 때만)

```
GET {base}/images/{assetId}
→ 200  image/png 또는 image/jpeg
```

**PNG와 JPEG만 된다.** 그 밖의 형식은 사이드카가 받는 자리에서 막는다 — 발행이
절반쯤 진행된 뒤 렌더러에서 터지는 것보다 원인을 빨리 말해 주기 때문이다.

---

## 사이드카가 여는 API

호스트 앱이 부르는 쪽이다. 자세한 것은 [TASKS.md](TASKS.md) T66~T68 참고.

| 부르는 때 | 요청 | 답 |
|---|---|---|
| 담당자가 발행할 때 | `POST /documents/issue` `{templateId, recipientId, issuedBy}` | `201 {id, status}` |
| 수신자에게 보낼 링크가 필요할 때 | `POST /documents/{id}/link` `{ttlSeconds?}` | `200 {token}` |
| 수신자가 문서를 열 때 | `GET /documents/view?token=…` | `200 {status, pdfBase64}` |
| 수신자가 서명할 때 | `POST /documents/sign` `{token, strokes, imagePng, authMethod}` | `200 {status}` |

뒤의 둘은 **수신자 브라우저가 직접 부른다**(`@report-tool/viewer`). 호스트는 링크만
전달하면 된다.

---

## 사이드카 세우기

```ts
// sidecar.mjs — 실제로 이게 전부다
import { createMiddleware, createSidecarParts } from "@report-tool/server";
import { PdfDocumentRenderer } from "@report-tool/renderer";
import { createServer } from "node:http";

const parts = createSidecarParts({
  host: {
    baseUrl: process.env.HOST_API_URL,          // 예: https://hr.isu.co.kr/report-api
    headers: { Authorization: `Bearer ${process.env.HOST_API_KEY}` },
  },
  tokenSecret: process.env.LINK_TOKEN_SECRET,   // 링크 서명 열쇠
  fontDir: "./fonts",                            // 임베딩할 TTF 폴더
});

const handler = createMiddleware(
  { ...parts.deps, renderer: new PdfDocumentRenderer(parts.fontProvider, parts.imageProvider) },
  { basePath: "/report" },
);
```

정해 둘 것 셋:

- **사이드카를 여러 대 띄운다면 `LINK_TOKEN_SECRET`이 모두 같아야 한다.** 다르면 A가
  만든 링크를 B가 열지 못하고, 그 증상은 수신자에게 "링크가 만료됐다"로 보인다
- **글꼴은 TTF여야 한다.** OTF는 임베딩 중 예외가 난다
- **`fonts` 폴더의 파일 이름은 `<가족>-Regular.ttf` · `<가족>-Bold.ttf`다.** 양식이
  선언한 글꼴 이름과 맞아야 한다

---

## 아직 확인하지 않은 것

이 문서의 계약은 어댑터 단위 테스트로 고정돼 있지만(`HttpAdapters.test.ts`),
**실제 Spring/Flask 앱을 상대로 끝까지 돌려 본 적은 없다.** 처음 붙일 때는
[EndToEnd.test.ts](../apps/admin/demo/EndToEnd.test.ts)와 같은 순서(발행 → 링크 →
열람 → 서명)로 한 번 통과시켜 보고, 특히 **저장된 파일의 SHA-256이 문서에 적힌
해시와 같은지**를 확인할 것. 그 하나가 어긋나면 서명이 증거가 되지 않는다.
