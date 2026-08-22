# 프로젝트 요약 (현재까지 확정된 내용)

이 문서는 [PRODUCT.md](PRODUCT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [../CLAUDE.md](../CLAUDE.md)에
흩어진 결정을 한 곳에 모은 요약이다. 상세 근거는 각 원본 문서를 참조한다.

---

## 1. 무엇을 만드는가

**한 문단 정의**

담당자가 브라우저 캔버스 위에서 급여명세서·계약서 같은 서류 양식을 직접 그려 만들고,
그 양식의 각 위치에 DB 필드(급여액, 성명 등)를 1:1로 연결해 템플릿으로 저장한 뒤,
발행 시점에 실제 직원 데이터를 결합해 문서를 확정·동결하고 링크로 배포하면,
직원이 열람 후 전자서명을 남길 수 있는 시스템을 — 특정 서비스에 종속되지 않고
다른 솔루션에 붙여 쓸 수 있는 자바스크립트 라이브러리/API 형태로 만든다.

**전제**: 서버까지 포함한 풀 솔루션을 가정하되, 설계는 열려 있게 — 특정 DB·스토리지·인증에
묶이지 않도록 전부 어댑터(포트) 뒤에 숨긴다.

---

## 2. 전체 흐름

```
[설계]  담당자가 캔버스에 양식을 그린다 → 요소마다 데이터 필드를 드롭다운으로 연결
          → 템플릿(JSON) 저장 → 발행(publish) 시 그 버전은 불변이 된다

[발행]  대상 직원 선택 → 서버가 실제 데이터 조회 → 템플릿+데이터 결합
          → 서버에서 PDF 생성 → SHA-256 해시 계산
          → { 템플릿버전 + 데이터스냅샷 + PDF해시 } 동결 저장

[배포]  문서 1건당 1회용 단기 만료 토큰 발급 → 링크 전달

[서명]  수신자가 링크로 열람 → 캔버스에 서명
          → 스트로크 + PDF해시 + 본인확인수단을 함께 기록 (감사로그)
```

### 왜 "동결"이 핵심 규칙인가
발행 후 담당자가 템플릿을 고치거나 DB 값이 정정돼도 이미 나간 문서는 바뀌지 않는다.
동결하지 않으면 "직원이 서명한 게 정확히 무엇이었나"를 증명할 수 없고,
그 순간 전자서명은 법적으로 무의미해진다.

### 왜 발행 PDF는 반드시 서버에서 만드는가
클라이언트가 렌더를 하면 클라이언트가 결과물을 통제하게 된다 — 위조 명세서 생성이 가능해진다.
그래서 렌더러는 두 등급으로 나눈다.

| 모드 | 실행 위치 | 용도 |
|---|---|---|
| `preview` | 브라우저 | 담당자 미리보기, 워터마크 강제, 해시 대상 아님 |
| `authoritative` | 서버 전용 | 실제 발행본, 해시 계산 대상, 브라우저 호출 시 예외 |

### 왜 라이브러리가 직접 DB/네트워크를 만지지 않는가
급여명세서엔 주민번호·계좌번호가 들어간다. 이 데이터가 라이브러리를 통해
외부로 나가서는 안 된다. 그래서 필요한 모든 I/O는 포트 인터페이스로만 선언하고,
구현은 호스트가 자기 인프라에 맞춰 제공한다. (`TemplateStore`, `DataProvider`,
`StorageAdapter`, `DocumentStore`, `AuthAdapter`, `FontProvider`)

---

## 3. MVP 범위

전 단계가 끝까지 동작하되 각 단계는 최소 기능만 갖춘 **얇은 수직 슬라이스**.

| 단계 | MVP | v1 이후 |
|---|---|---|
| 설계 | 텍스트·필드·이미지·박스·선, 단순 반복 테이블 | 조건부 표시, 다중 페이지, 페이지 자동분할 |
| 바인딩 | 드롭다운 선택 + 포맷터(통화·날짜·숫자·마스킹) | 계산식, 집계 |
| 발행 | 데이터 동결 + 서버 PDF + SHA-256 | 대량 발행 큐, 재발행 정책 |
| 배포 | 1회용 단기 만료 토큰 링크 | 메일·알림 발송, 만료 재발급 |
| 서명 | 단일 서명자, 스트로크+PNG, 감사로그 | 다중·순차 서명자, PAdES/RFC3161 타임스탬프 |
| 본인확인 | 링크 토큰만 | SMS OTP, 사내 SSO |

**명시적으로 제외**: 협업 편집, 템플릿 마켓, 다국어, 접근성 HTML 뷰, 모바일 전용 UI.

---

## 4. 개발 규칙 (사용자 지정, 예외 없음)

1. **TypeScript + OOP** — `any` 금지. 로직은 클래스에. 분기는 다형성(Visitor 등)으로.
2. **가독성 우선** — 메서드 20줄 제한, 이름 축약 금지, 영리한 한 줄보다 지루한 세 줄.
3. **한글 주석 의무** — 모든 클래스·메서드 위에 "왜 존재하는지"를 한글 JSDoc으로.
4. **Layered Architecture** — `presentation/infrastructure → application → domain`.
   의존은 항상 안쪽(domain)을 향한다. `domain`은 어떤 외부 패키지도 import하지 않는다.
5. **과한 구조 금지** — 패턴은 5개로 제한: **Visitor, Strategy, Command, Port&Adapter, Factory**.
   CQRS·이벤트소싱·DI 컨테이너는 쓰지 않는다.

---

## 5. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 언어 | TypeScript | 스키마 타입 자체가 제품 |
| 개발 프레임워크 | **React** (JSX+훅) | 유지보수는 사람이 하므로 익숙한 생태계 필요 |
| 호스트에게 강제하는 것 | **없음** | React를 번들에 내장해서 해결 (아래 6번) |
| 캔버스 편집기 | Konva.js | Transformer 내장, 씬그래프가 얇아 자체 스키마 소유 쉬움 |
| PDF 생성 | pdf-lib + @pdf-lib/fontkit | 순수 JS, 서버/브라우저 양쪽 동작 |
| 한글 폰트 서브셋 | **subset-font (harfbuzz)** | 아래 7번 참조 — 검증된 필수 경로 |
| PDF 뷰어 | pdf.js | 미리보기와 발행본을 어디서든 동일하게 |
| 서명 캡처 | perfect-freehand | 벡터 스트로크 — 확대해도 안 깨짐 |
| 폰트 | Pretendard (OFL) | 화이트리스트 3~5종으로 제한 |
| 빌드 | Vite library mode | ESM + UMD 동시 출력 |
| 데모 앱 | Next.js + React | `apps/admin` — 도그푸딩·영업 데모 전용 |
| 서버 프레임워크 | 특정 프레임워크 없음, 표준 `Request→Response` | Next/Hono/Express 어디든 그대로 붙음 |
| 모노레포 | npm workspaces | pnpm 미설치 환경이라 npm으로 결정 |

### React를 쓰지만 강요하지 않는 방법 (듀얼 빌드)
같은 소스, 빌드 설정만 두 벌.

| 산출물 | React 처리 | 대상 |
|---|---|---|
| `designer.standalone.js` (UMD) | 번들에 포함 | 레거시 호스트 (JSP, ASP.NET, jQuery) |
| `designer.esm.js` | external / peerDep `>=18` | React 호스트 — 중복 로드 제거 |

인사·급여 시스템은 레거시가 많아 React를 강제하면 도입 자체가 막히기 때문.
Preact(3KB)도 검토했으나 컴포넌트 라이브러리 호환성 리스크 때문에 기각 —
이미 Konva(~130KB)·pdf.js를 싣는 제품에서 React 45KB는 노이즈로 판단.

---

## 6. 검증된 기술 제약 (실제로 재현·확인함)

### 한글 폰트 서브셋 — 반드시 지켜야 할 경로
`@pdf-lib/fontkit`의 `subset: true`는 **한글 글리프를 조용히 누락**시킨다.
실측: `가나다라마바`가 사라지고 `사아자차카타파하`만 렌더됨 (예외 없이 빈칸 처리라 더 위험).
또한 OTF(CFF 아웃라인) 폰트는 임베딩 중 `Cannot read properties of undefined ('topDict')` 예외 발생.

**채택한 경로**: harfbuzz 기반 `subset-font`로 미리 서브셋 → `subset: false`로 임베딩.

| 방식 | 결과 |
|---|---|
| `subset: true` (fontkit) | 글리프 누락 — 사용 금지 |
| `subset: false` (서브셋 없음) | 정상이나 폰트 1종당 2.4MB |
| **harfbuzz 선서브셋 + `subset: false`** | **정상, 최종 PDF 34.9KB (98.6% 절감)** ← 채택 |

폰트는 TTF만 사용 (OTF 금지).

### 미해결 항목
- PoC 출력에서 `ISU-20194`가 `ISU- 20194`처럼 보이는 자간 이상 — 서브셋 폭 문제인지
  렌더러(qlmanage) 표시 문제인지 미확인. `PdfTextLayout` 구현 전 검증 필요.
- 표 행이 페이지를 넘칠 때의 분할 규칙은 v1로 미룸.
- 브라우저에서 `subset-font`(WASM) 동작 여부 — 미리보기를 캔버스로만 처리하면 불필요.

---

## 7. 절대 바꾸지 않는 설계 결정

| 결정 | 이유 |
|---|---|
| 좌표 단위는 **mm** (px 아님) | px로 저장하면 화면 배율에 따라 PDF·인쇄에서 어긋난다 |
| `schemaVersion` 필드 유지 | 마이그레이션의 유일한 근거 |
| 캔버스 라이브러리(Konva 등)의 직렬화 결과를 그대로 저장하지 않음 | 라이브러리 버전 업그레이드 시 과거 문서가 깨진다 |
| 발행 시 데이터·템플릿·PDF해시를 동결 | "무엇에 서명했는가"를 증명하는 유일한 근거 |
| 라이브러리는 I/O를 직접 하지 않음 (포트로만) | 급여 데이터가 고객사 밖으로 나가면 안 된다 |
| PDF 발행본은 항상 서버에서 생성 | 클라이언트 렌더는 위조를 허용한다 |

---

## 8. 패키지 구조

```
@report-tool/core       domain + application   isomorphic   스키마·규칙·유스케이스·포트
@report-tool/renderer   infrastructure          isomorphic   PDF·Canvas 렌더링
@report-tool/designer   presentation            browser      캔버스 에디터 (React 듀얼빌드)
@report-tool/viewer     presentation            browser      문서 열람 + 서명 (React 듀얼빌드)
@report-tool/server     infra + presentation    node         발행·배포·서명 접수 HTTP
apps/admin                                      Next.js      데모 · 도그푸딩 · 어댑터 참조 예제
```

레이어 의존 방향: `presentation/infrastructure → application → domain` (항상 안쪽으로).
`domain`은 어떤 외부 패키지도 import하지 않는다 (Node API, 브라우저 API 포함 전부 금지).

핵심 도메인 클래스 (설계만 완료, 구현 전):
- `Frame` (값 객체, mm 사각형) · `Element` 추상 클래스 + 7종 하위클래스 (Text/Field/Table/Image/Box/Line/Signature)
- `ElementVisitor` (렌더러가 요소 종류를 빠짐없이 처리하도록 컴파일 타임에 강제)
- `Template` / `IssuedDocument` 엔티티, `ValueFormatter` Strategy 계열
- `TemplateStore` / `DataProvider` / `StorageAdapter` / `DocumentStore` / `AuthAdapter` 포트

전체 파일 트리는 [ARCHITECTURE.md 3절](ARCHITECTURE.md#3-파일-트리) 참조.

---

## 9. 지금까지 실제로 한 일

1. 모노레포 골격 생성 (`packages/*`, `apps/poc`, npm workspaces)
2. 템플릿/문서/어댑터 스키마 **1차 초안 작성 후 폐기** — OOP+Layered 규칙 확정에 따라 재설계 예정
3. **한글 PDF 렌더 PoC 완료 및 검증**:
   - `apps/poc/font-poc.mjs` — 임금명세서 전체 레이아웃, mm↔pt 변환, 반복 테이블, 서명란 자리까지 포함해 실제 PDF 생성 성공
   - `apps/poc/cmp.mjs`, `subset2.mjs` — fontkit 서브셋 버그를 격리하고 harfbuzz 우회 경로를 실측으로 확정
4. 문서 3종 작성: `CLAUDE.md`(규칙), `PRODUCT.md`(제품), `ARCHITECTURE.md`(구조)
5. 프레임워크 결정: React 채택 + 듀얼 빌드로 호스트 비강제 원칙 유지

## 10. 다음 단계 — 작업 목록

[TASKS.md](TASKS.md)에 MVP 구현을 78개 작업으로 쪼갠 목록이 있다. 각 작업은 파일 경로·클래스/메서드 시그니처·완료 조건까지 적혀 있어, 이 문서만 보고도 독립적으로 구현할 수 있다.
