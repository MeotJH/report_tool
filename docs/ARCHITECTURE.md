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
| `@report-tool/renderer` | infrastructure | node | 한글 폰트 서브셋과 PDF 렌더링 |
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
│   │   │   ├── TableElement.ts       정적·데이터 표의 공통 배치와 표현
│   │   │   ├── TableCellResolver.ts   표 셀 2단 해석 (행 → 문서 데이터)
│   │   │   ├── TableSource.ts        정적 행 / Binding 배열 공급 Strategy
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
│   │   ├── text/
│   │   │   └── TextLayout.ts        문단·줄 나누기 (캔버스·PDF 공용 근거)
│   │   ├── template/
│   │   │   ├── Template.ts           엔티티. 요소·변수 보유, 버전 규칙, toJSON
│   │   │   ├── TemplateFactory.ts    저장 JSON → Template 복원 (schemaVersion 검증)
│   │   │   ├── TemplateVariable.ts   문서가 요구하는 데이터 선언 (평평한 점 경로)
│   │   │   ├── TemplateReferences.ts 요소가 참조하는 데이터 경로 수집
│   │   │   ├── TemplateValidator.ts  필수 항목·바인딩·변수 유효성 검사
│   │   │   ├── KoreanParticle.ts     오류 메시지의 조사 선택
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
│   └── font/
│       ├── FontSubsetter.ts          harfbuzz 서브셋 (fontkit 우회)
│       └── UsedCharCollector.ts      템플릿+데이터에서 사용 문자 수집
│
├── designer/src/
│   ├── Designer.ts                   파사드. 호스트가 쓰는 유일한 진입점
│   ├── controller/
│   │   ├── EditorController.ts       편집 상태 총괄 (템플릿·선택·도구·보기·모드)
│   │   ├── EditorActions.ts          사용자 행동 → Command 변환 (삭제·복제·정렬·순서·페이지)
│   │   ├── EditorKeyboardController.ts 단축키 전략 모음
│   │   ├── SelectionModel.ts         선택 요소 관리 (다중 선택)
│   │   ├── SnapGuide.ts              스냅 계산 + 걸린 기준선 반환
│   │   ├── ResizeHandleSet.ts        8방향 손잡이 위치·크기변경 계산
│   │   ├── ViewportState.ts          확대율 (문서가 아니므로 Undo 대상 아님)
│   │   ├── TransformPreview.ts       확정 전 화면 전용 상태 (드래그·안내선·영역선택)
│   │   ├── FrameBounds.ts            다중 선택 경계 계산
│   │   ├── TableColumnFitter.ts      열 너비 합을 표 프레임에 맞춤
│   │   ├── LayerOrder.ts             z를 촘촘한 정수로 재배정
│   │   ├── ElementAlignment.ts       정렬·분배 배치 계산
│   │   ├── ElementCloner.ts          Factory 왕복 기반 복제
│   │   ├── ElementClipboard.ts       편집기 전용 복사 보관소
│   │   ├── TemplateIssueFinder.ts    core 검증 오류 + 편집 경고 수집
│   │   ├── FieldPlacementPlanner.ts  팔레트 필드 배치 위치 결정
│   │   ├── PaletteEntry.ts           선언 변수를 점 경로 트리 목록으로
│   │   ├── PaletteDrag.ts            끌어온 항목이 놓인 자리를 스스로 해석 (배열/단일)
│   │   ├── TableColumnPlanner.ts     배열 자식 스키마 → 표 열 구성
│   │   ├── TableCellLocator.ts       표 안 좌표 ↔ 편집 대상 ↔ 셀 영역
│   │   ├── TableCellValueParser.ts   입력 문자열 → 저장 셀 값
│   │   ├── CanvasEditTarget.ts       입력기가 무엇을 편집 중인지 표현
│   │   ├── CanvasEditSession.ts      대상별 값·영역·확정 전략
│   │   └── TableEditor.ts            표 편집 규칙
│   ├── command/
│   │   ├── EditorCommand.ts          Command 추상 클래스
│   │   ├── CommandStack.ts           undo / redo
│   │   ├── CompositeCommand.ts       여러 변경을 Undo 한 번으로 묶는다
│   │   ├── AddElementCommand.ts
│   │   ├── RemoveElementCommand.ts
│   │   ├── TransformElementCommand.ts  이동+크기변경 통합 (분리해도 로직이 같음)
│   │   ├── ChangeElementCommand.ts   배치 외 속성 변경 전체 (아래 6.4 참조)
│   │   ├── ChangePageCommand.ts      용지·방향·여백
│   │   ├── BindFieldCommand.ts
│   │   └── TableCommands.ts          표 셀·행·열·Source 명령
│   ├── tool/
│   │   ├── EditorTool.ts             Tool 추상 클래스 + DragCreateTool
│   │   ├── SelectTool.ts             이동·크기변경·영역선택 Gesture 전략
│   │   ├── TextTool.ts
│   │   ├── FieldTool.ts
│   │   ├── ShapeTool.ts              박스·선
│   │   ├── TableTool.ts
│   │   ├── ImageTool.ts
│   │   └── SignatureTool.ts
│   └── view/
│       ├── CanvasStage.ts            Konva 래핑. 라이브러리 격리 지점
│       ├── CanvasOverlay.ts          페이지·여백·선택선·핸들·안내선 등 보조 도형
│       ├── CanvasMetrics.ts          mm ↔ px 변환의 유일한 기준
│       ├── KonvaElementVisitor.ts    Element → Konva 도형 변환 (편집용, 아래 6.3 참조)
│       ├── CanvasTextMeasurer.ts    브라우저 글자 폭 측정 (TextLayout 주입용)
│       ├── LayerNamer.ts             요소 이름 도출 Visitor (저장하지 않는다)
│       ├── DesignerShell.tsx         3칸 레이아웃 (Layers/Data · Canvas · Inspector)
│       ├── LayersPanel.tsx           순서·잠금·숨김
│       ├── InspectorPanel.tsx        선택별 속성 (없음=페이지, 1개, 다중)
│       ├── CanvasEditOverlay.tsx     캔버스 위 입력기 (IME·Tab 이동)
│       ├── FieldPalette.tsx          데이터 목록 + 변수 추가·삭제 (React)
│       ├── VariableEditor.tsx        데이터 필드 / 배열 정의 폼
│       └── inspector/               속성 입력 컨트롤과 요소별 Visitor
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
| **Strategy** | `ValueFormatter`, `TableSource` | 포맷 알고리즘과 표 행 공급 방식을 교체 |
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

### 6.2 PDF 렌더러를 서버에서 하나만 유지하는 이유

미리보기와 발행본이 다른 코드로 그려지면 반드시 어긋난다. 따라서 두 결과 모두 서버의
같은 `PdfDocumentRenderer`를 사용하고 `RenderMode`로만 구분한다. 브라우저 디자이너는
preview PDF를 호스트 서버에 요청하고 pdf.js로 표시한다.

```ts
type RenderMode = 'preview' | 'authoritative';
```

초기 설계는 preview 렌더러를 브라우저에서도 실행하려 했지만, 채택한 `subset-font` 2.5.0이
Node의 `fs`와 `Buffer`에 의존한다는 사실을 T40 구현에서 확인했다. 브라우저용 서브셋 경로를
별도로 만들면 같은 렌더 파이프라인이라는 장점이 약해지므로 MVP에서는 두 모드 모두 서버에서
실행한다. 브라우저 환경에서 직접 호출하면 즉시 예외를 던진다.

---

### 6.3 캔버스 렌더러를 두지 않는 이유

원래 계획은 `CanvasDocumentRenderer`를 따로 만들어 에디터가 자체적으로 화면을 그리는 것이었다.
그런데 렌더러를 두 벌(PDF·Canvas) 두면 "미리보기와 발행본이 다른 코드로 그려지면 반드시
어긋난다"는 6.2의 원리를 스스로 어기게 된다. 두 렌더러가 시간이 지나며 미묘하게 달라지는 것은
거의 확정된 미래다.

그래서 미리보기는 별도 렌더러를 만들지 않고 **서버의 PDF 렌더러를 `preview` 모드로 호출한 뒤
브라우저에서 pdf.js로 표시**하는 경로 하나만 둔다. 화면에 보이는 것과 나중에 나올 발행본이
항상 같은 코드로 만들어지므로 어긋날 수가 없다.

다만 캔버스 에디터 자체(요소를 드래그·리사이즈하는 화면)는 텍스트를 픽셀 단위로 재현하는
"렌더러"가 아니라 **조작 가능한 도형**을 보여주는 것이므로 별도로 존재해야 한다.
이것은 `designer/view/KonvaElementVisitor.ts`가 맡는다 — Element를 Konva 도형으로
변환하지만, 최종 결과물의 근거(authoritative)는 되지 않는다. 편집 중 실제 인쇄 결과가
궁금하면 "미리보기" 버튼으로 PDF 렌더러를 preview 모드로 호출한다.

### 6.4 속성 변경 Command를 하나로 두는 이유

요소는 불변이므로 스타일·문구·바인딩·표현·잠금·숨김·순서 변경은 모두 "다른 인스턴스로
바꾼다"와 같다. 속성마다 Command 클래스를 만들면 Inspector 항목이 늘어날 때마다 같은
모양의 클래스가 계속 늘어나므로, `ChangeElementCommand(before, after)` 하나로 모은다.
배치 변경만 `TransformElementCommand`로 따로 두는데, 드래그와 방향키가 다루는 값이
요소 전체가 아니라 Frame 두 개이기 때문이다.

같은 이유로 `Element`의 공통 상태 변경 메서드도 하나뿐이다. 하위 클래스는
`withCommon`만 구현하고, `withFrame`·`withZ`·`withLocked`·`withHidden`은 기반
클래스가 그것으로 구현한다. 요소를 추가할 때 구현해야 하는 메서드가 종류마다
늘어나지 않는다.

`hidden`은 나중에 추가된 편집 상태이므로 저장 데이터에 없으면 `false`로 읽는다.
필드가 없는 기존 템플릿이 예전과 똑같이 동작하므로 `schemaVersion`은 1로 유지한다.

### 6.5 요소 이름을 저장하지 않는 이유

Layers 패널의 이름은 `LayerNamer`가 내용에서 도출한다. 템플릿에 저장하면 문구를 고친
뒤에도 옛 이름이 남아 목록과 문서가 어긋난다. 도출하면 항상 현재 내용과 일치하고
저장 스키마도 늘지 않는다.

### 6.6 저장 형식의 유일한 근거

"캔버스 라이브러리 직렬화 결과를 저장하지 않는다"는 결정을 실제로 지키는 지점은
`Template.toJSON()`과 `TemplateFactory.fromJSON()`이다. 호스트는 이 둘만 쓰며,
편집기는 파일도 네트워크도 만지지 않는다.

```
편집 → getTemplate().toJSON() → 호스트가 저장
호스트가 읽음 → TemplateFactory.fromJSON() → new Designer({ template })
```

`fromJSON`은 `schemaVersion`이 없거나 다르면 즉시 거부한다. 버전이 다른 데이터를
억지로 읽으면 일부 필드만 복원된 문서가 만들어지고, 그 상태로 다시 저장되면
원본을 잃는다. 페이지는 계산된 mm가 아니라 규격 이름(`A4`)으로 저장한다.

### 6.7 팔레트에서 끌어온 것이 무엇을 만드는가

사용자가 데이터 패널에서 끌어온 항목의 의미는 놓은 자리에 따라 달라진다.

| 끌어온 것 | 빈 곳에 놓기 | 표 위에 놓기 |
|---|---|---|
| 배열 필드 | 자식 스키마로 열이 구성된 데이터 표 생성 | 그 표를 데이터 표로 전환 |
| 배열 자식 필드 | 단일 데이터 필드 생성 | 같은 배열이면 그 열만 재연결 |
| 최상위 필드 | 단일 데이터 필드 생성 | 단일 데이터 필드 생성 |

네 갈래를 조건문으로 조합하면 한 메서드에 뒤섞이므로 `PaletteDrag`의 하위 전략이
각자 판단한다. 전환으로 사용자가 입력한 정적 행이 사라질 때는 막지 않고 알린다 —
모든 변경이 Undo 한 번으로 복원되기 때문이다.

### 6.8 호스트는 편집기에 확정된 높이를 줘야 한다

편집기는 `height: 100%`로 컨테이너를 채우고 내부 패널이 각자 스크롤한다. 호스트
컨테이너의 높이가 auto면 `100%`가 auto로 풀려 좌측 패널 길이만큼 편집기가 화면
밖으로 자란다. Shadow DOM 안의 마운트 요소에도 같은 이유로 높이를 지정한다.

### 6.9 누가 데이터 필드를 정하는가

**데이터 목록의 근거는 템플릿의 `variables` 하나뿐이다.** 호스트가 필드 스키마를
미리 넘겨주는 경로는 두지 않는다. 목록이 두 곳에서 오면 같은 경로가 양쪽에 있을 때
어느 쪽이 실제로 쓰이는지 화면에서도 코드에서도 판단할 수 없고, 담당자는 자기가
방금 만든 필드가 왜 목록에 안 보이는지를 설명받아야 한다.

문서가 무엇을 필요로 하는지 아는 사람은 그 문서를 설계하는 담당자다. 그래서 담당자가
편집기 안에서 선언하고, 발행 시 호스트가 그 경로를 채우지 못하면 검증이 드러낸다.
선언을 막아도 승인된 필드가 특정 수령인의 데이터에서 빠지는 것은 똑같이 막지 못한다.

선언은 **평평하게** 저장하고 중첩은 이름의 점 경로가 표현한다(`employee.phone`).
`PaletteEntryBuilder`가 접두사로 부모를 찾아 트리를 만든다. 자식 목록을 따로 두면
같은 것을 두 방식으로 저장하게 되고, 어느 쪽을 고쳐야 하는지가 매번 모호해진다.

**팔레트 행을 누르는 것은 문서를 바꾸지 않는다.** 누르면 그 데이터를 쓰는 요소가
캔버스에서 강조되고, 문서에 넣는 것은 드래그나 행의 `＋`다. 목록을 살펴보려던 사용자가
표를 통째로 얻는 일이 있어서 분리했다.

**템플릿 상수를 두지 않는 이유**: 고정 문구는 텍스트 요소와 정적 표 셀이 이미
저장한다. 상수는 "같은 값을 여러 곳에 쓸 때 한 번만 고친다"는 이점만 더하는데,
그 대가로 예약 이름공간·데이터 병합 지점·렌더러 결합이 늘어난다. 반복 입력이
실제로 문제가 될 때 추가한다.

`TemplateExpression`의 경로 패턴이 `\p{L}`을 허용하는 이유는 담당자가 선언하는 경로가
한글일 수 있기 때문이다. `\w`만 쓰면 그런 경로가 치환되지 않는다.

### 6.10 줄 나누기는 도메인이 한 번만 결정한다

편집 캔버스와 발행 PDF가 각자 줄을 나누면 반드시 어긋난다. 실제로 어긋났었다.

| | 문단 줄바꿈(`\n`) | 영역을 넘는 줄 |
|---|---|---|
| 이전 캔버스 | Konva가 처리 | **조용히 지웠다** (`Konva.Text`에 height를 주면 넘친 줄을 안 그린다) |
| 이전 PDF | **무시했다** (공백으로만 분리) | 프레임을 보지 않고 전부 그렸다 |

비밀유지서약서 제1조의 각 호가 캔버스에서는 3개만 보이고, PDF에서는 4개가
순서까지 뒤엉킨 채 겹쳐 나왔다. 담당자가 본 문서와 서명자가 받은 문서가 달랐다.

그래서 줄 나누기는 `core/domain/text/TextLayout` **하나만** 결정한다.

- **문단을 먼저 나눈다.** `\n`은 사용자가 직접 넣은 줄바꿈이므로 공백과 같이 다루면 안 된다.
- **폭 측정만 바깥에서 받는다.** 실제 글자 폭은 폰트가 정하고 그 지식은 렌더러에만 있다.
  `TextWidthMeasurer` 콜백으로 받으므로 domain은 여전히 폰트도 브라우저도 모른다.
  PDF는 임베딩 폰트로, 캔버스는 `CanvasTextMeasurer`(2D 컨텍스트)로 잰다.
- **어느 쪽도 조용히 지우지 않는다.** 넘치면 양쪽 다 넘쳐 보이게 두고,
  `TemplateIssueFinder`가 "문구 N줄이 요소 높이보다 길다"로 알린다.

두 측정기의 글리프 metric이 완전히 같지는 않으므로 경계 어절에서 드물게 줄이
갈릴 수 있다. 완전한 일치는 PDF 미리보기(T57-V)가 닫는다. 그때까지도 **문단 순서와
넘침 판정은 같다** — 문서가 달라지는 종류의 어긋남은 여기서 끝난다.

### 6.11 표 셀은 두 단계로 정해진다

급여명세서 표의 대부분은 **항목 이름은 모든 문서에서 같고 금액만 사람마다 다르다.**
그런데 `TableSource`는 정적(전부 템플릿 저장)이거나 데이터(전부 배열)뿐이라 이 모양을
표현할 수 없었다. 정적 셀에 `{{baseSalary}}`를 적으면 문자 그대로 발행됐다.

그래서 셀 값을 두 단계로 정한다.

1. 열의 `cellTemplate`(`{{row.amount}}`)이 **행에서** 값을 꺼낸다
2. 그 값이 다시 표현식이면 **문서 데이터로** 채운다

치환은 정확히 두 번이다. 데이터가 데이터를 가리키게 두면 순환을 막을 수 없고,
무엇이 찍힐지 사람이 읽어서 예측할 수도 없다.

이 계산은 `TableCellResolver` 하나가 한다. 캔버스·PDF·`UsedCharCollector`가 각자
하고 있었는데, 특히 폰트 수집이 빠지면 **치환된 한글이 서브셋에 없어 통째로 빈칸으로
발행된다.** 세 곳이 같은 규칙을 쓰는 것이 정확성의 조건이다.

설계 모드만 예외다. 정적 셀은 **1단계까지만** 해석해 사용자가 써 넣은 표현식을
그대로 보여 준다. 값으로 바꿔 버리면 캔버스에는 금액이 보이는데 그 칸을 더블클릭하면
표현식이 나타나 둘이 어긋난다.

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

**Phase 9 실측(2026-08-23)**: 배열 드롭·셀 입력·JSON 왕복까지 포함한 Vite production
build 기준 ESM은 368.83KB(gzip 93.24KB), React를 포함한 standalone UMD는
883.73KB(gzip 263.00KB)다.
ESM은 React·React DOM·`@report-tool/core`를 external로 두며, standalone은 모두 포함한다.

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
  서브셋 글리프 폭 문제인지 렌더러(qlmanage) 표시 문제인지 미확인. `TextLayout` 관련 재검증 필요.
- 표 행이 페이지를 넘칠 때의 분할 규칙 (v1)
- 브라우저에서 `subset-font`(WASM) 동작 여부 — 미리보기를 캔버스로만 처리하면 불필요
