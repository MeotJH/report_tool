# 코드 구조

## 1. 레이어

의존 방향은 **항상 안쪽(domain)을 향한다.** 역방향 import는 리뷰에서 반려한다.

```
┌─────────────────────────────────────────────────────────┐
│  presentation   Designer / Viewer / HTTP Controller     │  사용자·외부와 만나는 지점
├─────────────────────────────────────────────────────────┤
│  application    Service (유스케이스) + Port (인터페이스)  │  흐름을 조율. 기술을 모른다
├─────────────────────────────────────────────────────────┤
│  domain         Entity / ValueObject / 도메인 규칙        │  순수 로직. 아무것도 import 안 함
└─────────────────────────────────────────────────────────┘
             ▲
┌────────────┴────────────────────────────────────────────┐
│  infrastructure  Port 구현체 (PDF·Canvas·DB·Storage)      │  안쪽을 향해 의존
└─────────────────────────────────────────────────────────┘
```

| 레이어 | 할 수 있는 것 | 할 수 없는 것 |
|---|---|---|
| `domain` | 계산, 규칙 검증, 상태 전이 | import 자체가 금지 (Node·브라우저 API 포함) |
| `application` | 서비스 조율, 포트 호출 | 구체 기술(pdf-lib, Konva) 직접 사용 |
| `infrastructure` | 라이브러리·I/O 사용 | 도메인 규칙 판단 |
| `presentation` | UI 이벤트, 파사드 노출 | 비즈니스 로직 보유 |

---

## 2. 패키지 구성

| 패키지 | 레이어 | 실행 환경 | 역할 |
|---|---|---|---|
| `@report-tool/core` | domain + application | isomorphic | 스키마·규칙·유스케이스·포트 정의 |
| `@report-tool/renderer` | infrastructure | isomorphic | PDF·Canvas 렌더링 |
| `@report-tool/designer` | presentation | browser | 캔버스 에디터 |
| `@report-tool/viewer` | presentation | browser | 문서 열람 + 서명 |
| `@report-tool/server` | infra + presentation | node | 발행·배포·서명 접수 HTTP |

`designer`를 서버에서 import하면 깨진다(의도적). `core`는 어디서든 안전하다.

---

## 3. 파일 트리

```
packages/
├── core/src/
│   ├── domain/
│   │   ├── value/
│   │   │   ├── Frame.ts              mm 사각형. 이동·크기변경·좌표변환
│   │   │   ├── PageSpec.ts           용지 규격. mm ↔ pt 변환의 기준
│   │   │   ├── TextStyle.ts          글꼴·크기·정렬
│   │   │   └── Binding.ts            데이터 경로 + 포맷터 참조
│   │   ├── element/
│   │   │   ├── Element.ts            추상 클래스. accept(visitor) 보유
│   │   │   ├── ElementVisitor.ts     Visitor 인터페이스
│   │   │   ├── ElementFactory.ts     JSON → Element 역직렬화
│   │   │   ├── TextElement.ts
│   │   │   ├── FieldElement.ts       단일 데이터 필드
│   │   │   ├── TableElement.ts       반복 영역 (행 수가 가변)
│   │   │   ├── ImageElement.ts
│   │   │   ├── BoxElement.ts
│   │   │   ├── LineElement.ts
│   │   │   └── SignatureElement.ts   서명 자리. 발행 시엔 비어 있음
│   │   ├── format/
│   │   │   ├── ValueFormatter.ts     Strategy 추상 클래스
│   │   │   ├── CurrencyFormatter.ts
│   │   │   ├── DateFormatter.ts
│   │   │   ├── NumberFormatter.ts
│   │   │   ├── MaskFormatter.ts      주민번호·계좌번호용
│   │   │   └── FormatterRegistry.ts  FormatSpec → Formatter 해석
│   │   ├── template/
│   │   │   ├── Template.ts           엔티티. 요소 보유, 검증, 버전 규칙
│   │   │   ├── TemplateValidator.ts  필수 항목·바인딩 유효성 검사
│   │   │   └── BindingResolver.ts    데이터 + 바인딩 → 표시 문자열
│   │   └── document/
│   │       ├── IssuedDocument.ts     엔티티. 동결 규칙과 상태전이를 강제
│   │       ├── DocumentHash.ts       값 객체. 해시 비교 책임
│   │       ├── SignatureRecord.ts    서명 1건
│   │       └── AuditLog.ts           append-only 감사 기록
│   └── application/
│       ├── port/
│       │   ├── TemplateStore.ts      템플릿 저장소
│       │   ├── DocumentStore.ts      발행 문서 저장소
│       │   ├── DataProvider.ts       필드 목록 + 실제 데이터 조회
│       │   ├── StorageAdapter.ts     PDF 바이트 저장
│       │   ├── FontProvider.ts       폰트 바이트 공급
│       │   ├── AuthAdapter.ts        토큰 발급·검증
│       │   ├── DocumentRenderer.ts   렌더러 포트 (구현체는 PDF뿐이다)
│       │   └── HashProvider.ts       SHA-256
│       └── service/
│           ├── TemplateService.ts    템플릿 저장·발행·검증
│           ├── PreviewService.ts     미리보기 렌더 (워터마크 강제)
│           ├── IssuanceService.ts    발행: 결합 → 렌더 → 해시 → 동결
│           ├── DistributionService.ts 배포 토큰·링크 발급
│           └── SigningService.ts     서명 접수 + 해시 검증
│
├── renderer/src/
│   ├── pdf/
│   │   ├── PdfDocumentRenderer.ts    DocumentRenderer 구현 (preview/authoritative 공통)
│   │   ├── PdfElementVisitor.ts      요소별 PDF 그리기
│   │   └── PdfTextLayout.ts          박스 내 줄바꿈·축소
│   └── font/
│       ├── FontSubsetter.ts          harfbuzz 서브셋 (fontkit 우회)
│       └── UsedCharCollector.ts      템플릿+데이터에서 사용 문자 수집
│
├── designer/src/
│   ├── Designer.ts                   파사드. 호스트가 쓰는 유일한 진입점
│   ├── controller/
│   │   ├── EditorController.ts       편집 상태 총괄
│   │   ├── SelectionModel.ts         선택 요소 관리
│   │   └── SnapGuide.ts              스냅·정렬 보조선
│   ├── command/
│   │   ├── EditorCommand.ts          Command 추상 클래스
│   │   ├── CommandStack.ts           undo / redo
│   │   ├── AddElementCommand.ts
│   │   ├── RemoveElementCommand.ts
│   │   ├── TransformElementCommand.ts  이동+크기변경 통합 (분리해도 로직이 같음)
│   │   └── BindFieldCommand.ts
│   ├── tool/
│   │   ├── EditorTool.ts             Tool 추상 클래스
│   │   ├── SelectTool.ts
│   │   ├── TextTool.ts
│   │   ├── FieldTool.ts
│   │   ├── ShapeTool.ts              박스·선
│   │   └── TableTool.ts
│   └── view/
│       ├── CanvasStage.ts            Konva 래핑. 라이브러리 격리 지점
│       ├── KonvaElementVisitor.ts    Element → Konva 도형 변환 (편집용, 아래 6.3 참조)
│       └── FieldPalette.ts           바인딩 드롭다운 UI (React)
│
├── viewer/src/
│   ├── Viewer.ts                     파사드
│   ├── view/PdfPageView.ts           pdf.js 렌더
│   ├── signature/
│   │   ├── SignaturePad.ts           스트로크 캡처
│   │   └── StrokeSerializer.ts       스트로크 ↔ 저장 포맷
│   └── infrastructure/
│       └── SigningApiClient.ts       report-tool 서버 API 호출 (fetch)
│
└── server/src/
    ├── controller/
    │   ├── IssuanceController.ts     POST /documents/issue
    │   ├── DistributionController.ts POST /documents/:id/link
    │   └── SigningController.ts      GET/POST /documents/:id/(view|sign)
    └── infrastructure/
        ├── Router.ts                 경량 경로 매칭
        └── createMiddleware.ts       호스트 앱에 마운트하는 진입점

apps/admin/adapters/           참조용 어댑터 구현 (인메모리·파일시스템)
                                실제 서비스에는 호스트가 자체 구현을 넣는다.
                                MVP를 실행·시연하기 위한 예제이며 프로덕션 코드가 아니다.
```

---

## 4. 사용하는 패턴 5개 (이외 금지)

| 패턴 | 적용 위치 | 해결하는 문제 |
|---|---|---|
| **Visitor** | `ElementVisitor` | 요소 종류 × 렌더러 종류의 조합 폭발. 렌더러를 추가해도 도메인을 건드리지 않는다 |
| **Strategy** | `ValueFormatter` | 통화·날짜·마스킹 포맷을 `switch` 없이 교체 |
| **Command** | `EditorCommand` | undo/redo. 상태 diff 방식은 캔버스에서 금방 한계에 부딪힌다 |
| **Port & Adapter** | `application/port` | I/O를 전부 격리해 호스트 인프라를 꽂을 수 있게 한다 |
| **Factory** | `ElementFactory` | JSON 역직렬화 시 타입별 클래스 생성을 한 곳에 모은다 |

### Visitor를 쓰는 이유

요소가 7종, 렌더러가 2종(PDF·Canvas)이다. `switch(element.type)`를 렌더러마다 두면
요소를 하나 추가할 때 모든 렌더러를 찾아 고쳐야 하고, 빠뜨려도 컴파일이 통과한다.
Visitor는 **빠뜨리면 컴파일 에러**가 난다.

```ts
/** 요소 종류별 처리를 렌더러가 구현하도록 강제하는 방문자 인터페이스. */
export interface ElementVisitor<TResult> {
  visitText(element: TextElement): TResult;
  visitField(element: FieldElement): TResult;
  visitTable(element: TableElement): TResult;
  visitImage(element: ImageElement): TResult;
  visitBox(element: BoxElement): TResult;
  visitLine(element: LineElement): TResult;
  visitSignature(element: SignatureElement): TResult;
}
```

---

## 5. 코드 스타일 기준

아래가 이 프로젝트의 표준이다. 모든 파일이 이 형태를 따른다.

```ts
/**
 * 페이지 위의 사각 영역을 나타내는 값 객체.
 *
 * 단위는 항상 밀리미터이며 원점은 페이지 좌상단이다.
 * px를 쓰지 않는 이유는 화면 배율과 무관하게 인쇄물 크기가 같아야 하기 때문이다.
 * 값 객체이므로 변경 메서드는 자기 자신을 바꾸지 않고 새 인스턴스를 반환한다.
 */
export class Frame {
  private static readonly POINTS_PER_MM = 2.834645669291339;

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
  ) {}

  /** 주어진 거리만큼 이동한 새 Frame을 반환한다. */
  moveBy(deltaX: number, deltaY: number): Frame {
    return new Frame(this.x + deltaX, this.y + deltaY, this.width, this.height);
  }

  /** 특정 좌표가 이 영역 안에 있는지 판단한다. 요소 선택 판정에 쓰인다. */
  contains(pointX: number, pointY: number): boolean {
    return pointX >= this.x
      && pointX <= this.x + this.width
      && pointY >= this.y
      && pointY <= this.y + this.height;
  }

  /**
   * PDF 좌표계로 변환한다.
   * PDF는 원점이 좌하단이므로 y축을 페이지 높이 기준으로 뒤집어야 한다.
   */
  toPdfRect(pageHeightMm: number): { x: number; y: number; width: number; height: number } {
    const toPoints = (mm: number) => mm * Frame.POINTS_PER_MM;
    return {
      x: toPoints(this.x),
      y: toPoints(pageHeightMm - this.y - this.height),
      width: toPoints(this.width),
      height: toPoints(this.height),
    };
  }
}
```

**지켜야 할 것**
- 클래스·메서드 위 한글 JSDoc — 예외 없음
- `readonly` 기본. 변경이 필요하면 새 인스턴스 반환
- 매직 넘버는 `private static readonly` 상수로
- 이름 축약 금지

---

## 6. 결정 기록

### 6.1 한글 폰트 서브셋 (검증 완료)

`@pdf-lib/fontkit`의 `subset: true`는 한글 글리프를 조용히 누락시킨다.
실측 결과 `가나다라마바`는 사라지고 `사아자차카타파하`만 렌더됐다.
합성 글리프 처리 결함으로 추정되며, 예외가 나지 않고 **빈칸으로 출력**되므로 특히 위험하다.

또한 OTF(CFF 아웃라인)는 임베딩 단계에서 `Cannot read properties of undefined (reading 'topDict')`
예외가 발생한다. **TTF만 사용한다.**

채택한 경로와 실측치:

| 방식 | 결과 |
|---|---|
| `subset: true` (fontkit) | 글리프 누락 — **사용 금지** |
| `subset: false` | 정상이나 폰트 1종당 2.4MB |
| **harfbuzz 선(先)서브셋 + `subset: false`** | **정상, 최종 PDF 34.9KB (98.6% 절감)** ← 채택 |

```ts
const subsetBytes = await subsetFont(rawTtf, usedChars, { targetFormat: 'truetype' });
const font = await pdfDoc.embedFont(subsetBytes, { subset: false });
```

`UsedCharCollector`가 템플릿과 데이터를 순회해 실제 등장 문자만 모은다.

### 6.2 렌더러를 isomorphic으로 유지하는 이유

미리보기(브라우저)와 발행본(서버)이 다른 코드로 그려지면 반드시 어긋난다.
같은 `PdfDocumentRenderer`를 양쪽에서 쓰되 `RenderMode`로만 구분한다.

```ts
type RenderMode = 'preview' | 'authoritative';
```

`authoritative`는 브라우저 환경에서 호출되면 예외를 던진다.
우회는 가능하지만 실수로 프론트에서 발행본을 만드는 것을 막는다.

---

### 6.3 캔버스 렌더러를 두지 않는 이유

원래 계획은 `CanvasDocumentRenderer`를 따로 만들어 에디터가 자체적으로 화면을 그리는 것이었다.
그런데 렌더러를 두 벌(PDF·Canvas) 두면 "미리보기와 발행본이 다른 코드로 그려지면 반드시
어긋난다"는 6.2의 원리를 스스로 어기게 된다. 두 렌더러가 시간이 지나며 미묘하게 달라지는 것은
거의 확정된 미래다.

그래서 미리보기는 별도 렌더러를 만들지 않고 **PDF 렌더러를 `preview` 모드로 호출한 뒤
pdf.js로 표시**하는 경로 하나만 둔다. 화면에 보이는 것과 나중에 나올 발행본이 항상 같은
코드로 만들어지므로 어긋날 수가 없다.

다만 캔버스 에디터 자체(요소를 드래그·리사이즈하는 화면)는 텍스트를 픽셀 단위로 재현하는
"렌더러"가 아니라 **조작 가능한 도형**을 보여주는 것이므로 별도로 존재해야 한다.
이것은 `designer/view/KonvaElementVisitor.ts`가 맡는다 — Element를 Konva 도형으로
변환하지만, 최종 결과물의 근거(authoritative)는 되지 않는다. 편집 중 실제 인쇄 결과가
궁금하면 "미리보기" 버튼으로 PDF 렌더러를 preview 모드로 호출한다.

## 7. 프레임워크 선택

### 두 가지를 분리해서 판단한다

혼동하기 쉬우므로 명시한다.

| 질문 | 답 |
|---|---|
| **우리가 무엇으로 개발하는가** | React (JSX + 훅). 바닐라 DOM으로 짜지 않는다 |
| **호스트에게 무엇을 요구하는가** | 아무것도 요구하지 않는다 |

이 둘은 별개 문제다. React로 개발하되 호스트에게 React를 강요하지 않는 것이 가능하며,
그 방법은 React를 번들에 포함시키는 것이다.

### 호스트에게 프레임워크를 요구하지 않는 이유

인사·급여 시스템은 대부분 레거시다. Spring + JSP, ASP.NET, jQuery 화면에 붙여야 한다.
React를 peerDependency로 요구하는 순간 이런 호스트에서는 도입이 불가능해진다.
또한 호스트가 React 17인데 우리가 18을 요구하면 버전 충돌이 난다.

### 검토한 선택지

| 안 | 저작 경험 | 추가 용량(gzip, 대략) | 생태계 | 호스트 충돌 |
|---|---|---|---|---|
| Preact 내장 | React와 거의 동일 | ~4KB | `preact/compat`으로 대부분, 일부 실패 | 없음 |
| **React 내장 번들** | **100% React** | ~45KB | **100%** | **없음** ← 채택 |
| React peerDependency | 100% React | 0 | 100% | 버전 충돌 위험 |
| 순수 바닐라 | 유지보수 비용 큼 | 0 | 없음 | 없음 |

**React 번들 내장을 채택한다.**

Preact는 3KB로 매력적이지만, 에디터 UI에 필요한 드롭다운·모달·컬러피커·리사이즈 핸들을
직접 구현하면 그것이 실질적인 유지보수 부담이 된다.
컴포넌트 라이브러리를 쓰려 할 때 `preact/compat` 호환성 문제를 만나면
그 시점에는 이미 되돌리기 어렵다. 3KB를 아끼려고 질 리스크가 아니다.

용량 근거: 에디터는 이미 Konva를 약 130KB 싣고 뷰어는 pdf.js를 그보다 크게 싣는다.
문서 편집기에서 250KB대는 정상 범위이며, 여기서 45KB는 노이즈다.
(수치는 대략치. 번들 구성 후 실측하여 갱신할 것)

### 듀얼 빌드로 양쪽을 모두 만족시킨다

같은 소스에서 빌드 설정만 두 벌 유지한다.

| 산출물 | React 처리 | 대상 호스트 |
|---|---|---|
| `designer.standalone.js` (UMD) | 번들에 포함 | 레거시 (JSP, ASP.NET, jQuery) |
| `designer.esm.js` | external / peerDep `>=18` | React 호스트 — 중복 로드 제거 |

Vite의 `build.rollupOptions.external`만 다른 두 config이므로 유지보수 비용은 거의 없다.

### 패키지별 의존성

| 패키지 | 프레임워크 | 이유 |
|---|---|---|
| `core` | 없음 (순수 TS) | 도메인은 아무것도 import 하지 않는다 |
| `renderer` | 없음 (pdf-lib) | 서버·브라우저 양쪽에서 동일하게 동작해야 한다 |
| `designer` | React (듀얼 빌드) + Konva | |
| `viewer` | React (듀얼 빌드) + pdf.js | |
| `server` | 없음 (표준 Request/Response) | 특정 서버 프레임워크에 묶이지 않는다 |
| `apps/admin` | Next.js + React | 데모·도그푸딩·어댑터 참조 예제 전용 |

React UI는 Shadow DOM에 마운트해 호스트 CSS와의 충돌을 차단한다.

### 프레임워크 래퍼

`Designer`는 `container` 엘리먼트를 받아 마운트하고 `destroy()`로 정리하는
프레임워크 무관 파사드다. 따라서 각 프레임워크 래퍼는 20줄이면 된다.

```tsx
/** React 호스트를 위한 얇은 래퍼. 생명주기 연결 외에 아무 일도 하지 않는다. */
export function DesignerView(props: DesignerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const designer = new Designer({ ...props, container: containerRef.current! });
    return () => designer.destroy();
  }, []);
  return <div ref={containerRef} />;
}
```

### 서버는 웹 표준 핸들러로

Express·Fastify·Next 중 하나를 고르지 않는다.
`(request: Request) => Promise<Response>` 시그니처로 만들면 한 벌로 전부 커버된다.
Node 18+는 `Request`/`Response`가 내장이라 추가 의존성이 0이다.

| 호스트 환경 | 연결 방법 |
|---|---|
| Next.js App Router | `export const POST = handler` (그대로) |
| Hono / Bun / Deno / Workers | 그대로 |
| Express / Fastify | 10줄짜리 어댑터 |

### apps/admin 규칙

데모 앱은 `packages/*`의 **공개 API만** 사용한다.
내부 모듈을 직접 import하면 그 순간 도그푸딩의 의미가 사라진다.

## 8. 미해결 항목

- **하이픈 뒤 자간 이상**: PoC 출력에서 `ISU-20194`가 `ISU- 20194`처럼 보였다.
  서브셋 글리프 폭 문제인지 렌더러(qlmanage) 표시 문제인지 미확인. `PdfTextLayout` 구현 전 검증 필요.
- 표 행이 페이지를 넘칠 때의 분할 규칙 (v1)
- 브라우저에서 `subset-font`(WASM) 동작 여부 — 미리보기를 캔버스로만 처리하면 불필요
