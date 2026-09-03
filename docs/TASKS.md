# MVP 구현 작업 목록

이 문서는 MVP를 만들기 위해 해야 할 일을 **최소 단위로 쪼갠 목록**이다.

목적은 하나다 — **Claude 없이도 이 문서만 보고 사람이 스스로 코드를 짤 수 있게 만드는 것.**
그래서 각 작업은 "무엇을 만들라"가 아니라 **필드·메서드 시그니처, 지켜야 할 규칙, 완료를
확인하는 구체적인 방법**까지 적는다. 모호하면 실패한 작업 정의다.

관련 문서: [PRODUCT.md](PRODUCT.md) 제품 정의 · [ARCHITECTURE.md](ARCHITECTURE.md) 구조 원칙 ·
[SUMMARY.md](SUMMARY.md) 전체 요약 · [../CLAUDE.md](../CLAUDE.md) 코딩 규칙

---

## 이 문서를 읽는 법

### 작업 하나의 형식

```
### T-번호. 제목
- 파일: 만들 파일 경로
- 선행: 이 작업 전에 끝나 있어야 하는 작업 번호 (없음 = 지금 바로 시작 가능)
- 목표: 이 코드가 왜 존재하는지 한 문장
- 구현: 클래스/필드/메서드 시그니처와 지켜야 할 규칙을 항목별로
- 완료 조건: 사람이 스스로 "다 됐다"고 판단할 수 있는 구체적 기준 (테스트 시나리오)
```

### 진행 순서 원칙

**항상 번호가 낮은 순서대로 간다.** Layered Architecture 규칙("의존은 안쪽을 향한다")에 따라
`domain`이 전부 끝나야 `application`을 시작할 수 있고, `application`이 끝나야
`infrastructure`(renderer, designer, viewer, server)를 시작할 수 있다.

같은 구간(예: Phase 1의 T01~T05) 안에서는 선행 표시가 없으면 순서를 바꿔도 된다.

### 완료 조건을 검증하는 방법

`domain`, `application`, `renderer`의 순수 로직 코드는 **Vitest**로 단위 테스트를 짠다
(T01에서 설정). "완료 조건"에 적힌 시나리오를 `it('...', () => {...})`로 그대로 옮기면 된다.
`domain` 레이어는 아무것도 import하지 않으므로 목(mock)이 필요 없다 — 이게 이 구조를 쓰는
이유 중 하나다.

`designer`, `viewer`(브라우저 UI)는 자동 테스트 대신 **수동 확인 절차**를 적는다.
전체 흐름의 최종 검증은 Phase 14의 체크리스트 하나로 모은다.

---

## 아키텍처 문서와 달라진 점 (먼저 확인할 것)

작업을 쪼개다가 [ARCHITECTURE.md](ARCHITECTURE.md)의 최초 파일 트리에서 두 가지를 바꿨다.
문서도 함께 갱신했으니 아래는 왜 바꿨는지만 요약한다.

1. **`renderer/canvas/*` (CanvasDocumentRenderer, CanvasElementVisitor) 를 없앴다.**
   렌더러를 PDF용·Canvas용 두 벌로 만들면 "미리보기와 발행본이 다른 코드로 그려지면
   반드시 어긋난다"는 원칙을 스스로 어기게 된다. 대신 미리보기도 **PDF 렌더러를
   `preview` 모드로 호출 → pdf.js로 표시**하는 경로 하나만 쓴다.
   (편집 캔버스 자체는 다른 문제라 `designer/view/KonvaElementVisitor.ts`로 남긴다 — T45 참조.)
2. **참조 어댑터(인메모리 저장소 등)는 `apps/admin/adapters/`에 둔다.**
   "라이브러리는 I/O를 하지 않고 호스트가 구현한다"는 원칙은 그대로 유지하되,
   MVP를 실제로 실행해보려면 예제 구현체가 있어야 한다. `apps/admin`은 원래도
   도그푸딩·데모 전용이었으므로 여기가 맞는 자리다. **프로덕션에 그대로 쓰면 안 된다.**

---

## 전체 목차 (78개 작업)

| Phase | 범위 | 작업 번호 | 실행 환경 | 상태 |
|---|---|---|---|---|
| 0 | 프로젝트 기반 설정 | T01~T02 | - | ✅ |
| 1 | Domain: 값 객체 | T03~T07 | isomorphic | ✅ |
| 2 | Domain: 값 포맷터 (Strategy) | T08~T13 | isomorphic | ✅ |
| 3 | Domain: 요소 (Element + Visitor) | T14~T22 | isomorphic | ✅ |
| 4 | Domain: 템플릿 엔티티 | T23~T25 | isomorphic | ✅ |
| 5 | Domain: 발행 문서 엔티티 | T26~T28 | isomorphic | ✅ |
| 6 | Application: 포트 | T29~T32 | isomorphic | ✅ |
| 7 | Application: 서비스 | T33~T37 | isomorphic | ✅ |
| 8 | Renderer: PDF 생성 | T38~T43 | node | ✅ |
| 9 | Designer: 캔버스 에디터 | T44~T57 | browser | ✅ (+ 리포트 로드맵 1~13단계) |
| 10 | Viewer: 열람 + 서명 | T58~T63 | browser | ⬅ **다음** |
| 11 | Server: HTTP 계층 | T64~T68 | node | ✅ |
| 12 | 참조 어댑터 (데모용) | T69~T73 | node | |
| 13 | 데모 앱 연결 | T74~T77 | node + browser | |
| 14 | 통합 검증 | T78 | - | |

Phase 0~7(T01~T37)은 `domain`/`application`뿐이라 브라우저도 서버도 없이 순수 로직만
Vitest로 검증한다. Phase 8부터 비로소 pdf-lib·Konva·pdf.js 같은 실제 기술이 등장한다.

---

## Phase 0 — 프로젝트 기반 설정

### T01. 모노레포 공통 설정 (tsconfig + Vitest)
- 파일: `tsconfig.base.json`, `vitest.config.ts` (루트)
- 선행: 없음
- 목표: 모든 패키지가 같은 컴파일 규칙과 테스트 실행기를 공유하게 한다. 패키지마다
  설정이 다르면 "여기선 되는데 저기선 안 된다"는 문제가 생긴다.
- 구현:
  - `tsconfig.base.json`: `strict: true`, `target: ES2022`, `module: ESNext`,
    `moduleResolution: bundler`, `declaration: true`, `noUncheckedIndexedAccess: true`
    (배열 인덱스 접근 시 `undefined` 가능성을 타입에 강제 반영 — domain 코드의 안전성에 중요)
  - `npm i -D vitest typescript` (루트, devDependency)
  - `vitest.config.ts`: `packages/*/src/**/*.test.ts` 패턴을 인식하게 설정
  - 루트 `package.json`의 `scripts`에 `"test": "vitest run"` 추가
- 완료 조건: `packages/core/src/domain/value/Frame.test.ts`에 아무 내용 없는
  `it('placeholder', () => expect(true).toBe(true))`를 넣고 `npm test`로 통과하는지 확인.

### T02. `@report-tool/core` 패키지 초기화
- 파일: `packages/core/package.json`, `packages/core/tsconfig.json`
- 선행: T01
- 목표: `core`는 다른 모든 패키지가 참조하는 기반이므로 가장 먼저 패키지로서 성립해야 한다.
- 구현:
  - `package.json`: `"name": "@report-tool/core"`, `"type": "module"`,
    `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`,
    `"exports": { ".": "./dist/index.js" }`
  - `tsconfig.json`: `extends: "../../tsconfig.base.json"`, `outDir: "dist"`, `rootDir: "src"`
  - `src/index.ts`: 지금은 빈 파일로 두되, 이후 모든 공개 클래스를 여기서 `export`한다
    (호스트가 이 파일 하나만 보고 무엇을 쓸 수 있는지 알 수 있어야 한다)
- 완료 조건: `npx tsc -p packages/core` 가 에러 없이 끝난다.

---

## Phase 1 — Domain: 값 객체 (Value Objects)

`domain` 레이어는 **어떤 외부 패키지도 import하지 않는다.** Node API, 브라우저 API도 안 된다.
이 규칙 덕분에 이 구간의 모든 테스트는 목(mock) 없이 순수하게 짤 수 있다.

### T03. Frame — mm 사각형
- 파일: `packages/core/src/domain/value/Frame.ts`
- 선행: T02
- 목표: 모든 요소의 위치·크기를 표현하는 기본 단위. 좌표계를 mm로 고정해 화면 배율과
  무관하게 인쇄 크기가 항상 같도록 만든다.
- 구현: [ARCHITECTURE.md 5절](ARCHITECTURE.md#5-코드-스타일-기준)에 완성된 예시 코드가 있다.
  그 코드를 그대로 파일로 옮긴다. 추가로:
  - `equals(other: Frame): boolean` — 네 필드가 모두 같은지 비교
  - `resizeTo(width: number, height: number): Frame` — 위치는 유지하고 크기만 바꾼 새 인스턴스 반환
  - 생성자에서 `width < 0 || height < 0`이면 `throw new Error('Frame 크기는 음수가 될 수 없다')`
- 완료 조건 (Vitest):
  - `new Frame(0,0,10,10).moveBy(5,5)` → `{x:5,y:5,width:10,height:10}`과 `equals` true
  - `new Frame(0,0,10,10).contains(5,5)` → true, `.contains(20,20)` → false
  - `new Frame(20,35,60,8).toPdfRect(297)` → y값이 `(297-35-8) * 2.834645669291339`와 근사(소수 오차 허용)
  - `new Frame(0,0,-1,10)` → 예외 발생

### T04. PageSpec — 용지 규격
- 파일: `packages/core/src/domain/value/PageSpec.ts`
- 선행: T02
- 목표: A4 등 용지 크기와 여백을 관리하고, 여백을 뺀 "실제 그릴 수 있는 영역"을 계산해준다.
- 구현:
  - `type PageSize = 'A4' | 'A5' | 'LETTER'`
  - `private static readonly SIZES_MM: Record<PageSize, {width: number; height: number}>`
    — A4: 210×297, A5: 148×210, LETTER: 215.9×279.4
  - 클래스 `PageSpec`: 생성자 `(size: PageSize, orientation: 'portrait'|'landscape', margin: [number,number,number,number])`
    (margin 순서는 [상,우,하,좌] — CSS 관례와 동일하게 통일)
  - `widthMm(): number` — orientation이 landscape면 SIZES_MM의 width/height를 서로 바꿔 반환
  - `heightMm(): number` — 위와 동일한 논리
  - `contentFrame(): Frame` — 페이지에서 margin을 뺀 영역. `x = margin[3]`, `y = margin[0]`,
    `width = widthMm() - margin[1] - margin[3]`, `height = heightMm() - margin[0] - margin[2]`
- 완료 조건:
  - `new PageSpec('A4', 'portrait', [15,15,15,15]).widthMm()` → 210, `.heightMm()` → 297
  - `new PageSpec('A4', 'landscape', [15,15,15,15]).widthMm()` → 297
  - `.contentFrame()` → `Frame(15, 15, 180, 267)` (A4 portrait 기준)

### T05. TextStyle — 글자 스타일
- 파일: `packages/core/src/domain/value/TextStyle.ts`
- 선행: T02
- 목표: 폰트·크기·정렬을 값 객체로 묶어 텍스트 관련 요소들이 재사용하게 한다.
- 구현:
  - 필드: `font: string`, `size: number`(pt), `weight: 400|500|700`, `italic: boolean`,
    `color: string`(#RRGGBB), `align: 'left'|'center'|'right'`, `valign: 'top'|'middle'|'bottom'`,
    `lineHeight: number`(배수, 기본 1.4), `overflow: 'wrap'|'shrink'|'truncate'`
  - 전부 `readonly`. 생성자는 필수값(`font`, `size`)만 받고 나머지는 기본값을 갖는
    옵션 객체로 받는다: `constructor(font: string, size: number, options?: Partial<{...}>)`
  - `scaledBy(factor: number): TextStyle` — `size`만 `size * factor`로 바꾼 새 인스턴스
    (T43의 "shrink" overflow 정책이 이 메서드를 쓴다)
- 완료 조건:
  - `new TextStyle('Pretendard', 10).scaledBy(0.8).size` → 8
  - 옵션을 안 주면 `align`이 `'left'`, `overflow`가 `'wrap'`인지 확인

### T06. DataPath — 데이터 경로 조회
- 파일: `packages/core/src/domain/value/DataPath.ts`
- 선행: T02
- 목표: `"employee.name"` 같은 점 표기 문자열로 임의의 데이터 객체에서 값을 안전하게
  꺼낸다. 중간에 어떤 값이 없어도 예외 대신 `undefined`를 반환해 호출자가 판단하게 한다.
- 구현:
  - `constructor(path: string)` — 생성자에서 `path.split('.')`로 나눠 `private readonly segments: string[]`에 저장
  - `resolve(data: unknown): unknown` — `segments`를 순서대로 따라가며 접근.
    현재 값이 `null`이거나 `undefined`이거나 객체가 아니면 그 즉시 `undefined` 반환
    (배열 인덱스 문법 `a[0]`은 MVP 범위에서 지원하지 않는다 — 표의 반복행은 T19에서
    별도 방식으로 처리한다)
  - 빈 문자열(`""`)로 생성하면 생성자에서 예외
- 완료 조건:
  - `new DataPath('a.b.c').resolve({a:{b:{c:5}}})` → 5
  - `new DataPath('a.x.c').resolve({a:{b:{c:5}}})` → undefined (중간 경로 없음)
  - `new DataPath('a.b.c').resolve(null)` → undefined
  - `new DataPath('a.b.c').resolve({a: {b: 3}})` → undefined (`3.c` 접근 시도하지 않고 안전 종료)

### T07. Binding — 데이터 바인딩 설정
- 파일: `packages/core/src/domain/value/Binding.ts`
- 선행: T06
- 목표: "이 요소는 어떤 데이터를, 어떤 포맷으로, 없으면 뭘로 보여줄지"를 담는 순수 설정값.
  **로직은 담지 않는다** — 실제로 값을 꺼내고 포맷을 적용하는 일은 T27 `BindingResolver`가 한다.
  (설정과 동작을 분리해야 `Binding`을 JSON으로 직렬화하기 쉽다)
- 구현:
  - 필드: `path: DataPath`, `formatSpec: FormatSpec | null`(T08에서 정의), `fallback: string | null`,
    `required: boolean`
  - 생성자: `constructor(pathString: string, options?: {formatSpec?: FormatSpec; fallback?: string; required?: boolean})`
    내부에서 `new DataPath(pathString)`을 만들어 보관
  - 이 클래스는 `resolve`나 `format` 같은 메서드를 갖지 않는다 (의도적)
- 완료 조건: 위 필드가 생성자 인자대로 정확히 채워지는지 확인하는 테스트 3~4개.
  `required: true`가 기본값 `false`인지도 확인.

---
## Phase 2 — Domain: 값 포맷터 (Strategy 패턴)

통화·날짜·마스킹 등 "값을 문자열로 바꾸는 방법"이 여러 갈래로 나뉜다.
`if/switch`로 나열하지 않고 **각 방식을 별도 클래스로 만들어 교체 가능하게** 한다.

### T08. FormatSpec 타입 + ValueFormatter 추상 클래스
- 파일: `packages/core/src/domain/format/FormatSpec.ts`, `packages/core/src/domain/format/ValueFormatter.ts`
- 선행: T02
- 목표: 포맷 종류를 판별 가능한 데이터(`FormatSpec`, 직렬화 대상)와, 실제로 변환을
  수행하는 행위(`ValueFormatter`, 클래스)로 나눈다.
- 구현:
  - `FormatSpec.ts`는 클래스가 아니라 **판별 유니온 타입**(discriminated union)이다.
    직렬화 가능한 순수 데이터이기 때문이다:
    ```ts
    export type FormatSpec =
      | { kind: 'text' }
      | { kind: 'currency'; currency: 'KRW' | 'USD'; showSymbol?: boolean }
      | { kind: 'number'; decimals?: number; thousands?: boolean }
      | { kind: 'date'; pattern: string }
      | { kind: 'mask'; keepHead?: number; keepTail?: number; maskChar?: string };
    ```
  - `ValueFormatter` 추상 클래스: `abstract format(rawValue: unknown): string` 메서드 하나만 선언
- 완료 조건: 타입 체크만으로 충분 (`npx tsc` 통과). 아직 구현체가 없으므로 런타임 테스트는 없음.

### T09. CurrencyFormatter
- 파일: `packages/core/src/domain/format/CurrencyFormatter.ts`
- 선행: T08
- 목표: 급여액처럼 큰 숫자를 "3,800,000원" 형태로 보여준다.
- 구현:
  - `constructor(currency: 'KRW'|'USD', showSymbol: boolean = true)`
  - `format(rawValue: unknown): string` — `Number(rawValue)`가 `NaN`이면 빈 문자열 반환.
    `toLocaleString('ko-KR')`로 천단위 구분 후, `showSymbol`이 true면 KRW는 `'원'` 접미사,
    USD는 `'$'` 접두사를 붙인다.
- 완료 조건:
  - `new CurrencyFormatter('KRW').format(3800000)` → `'3,800,000원'`
  - `new CurrencyFormatter('USD').format(1200)` → `'$1,200'`
  - `new CurrencyFormatter('KRW').format('abc')` → `''`

### T10. NumberFormatter
- 파일: `packages/core/src/domain/format/NumberFormatter.ts`
- 선행: T08
- 목표: 단순 숫자(근무시간 등)를 소수점·천단위 구분 옵션대로 표시한다.
- 구현:
  - `constructor(decimals: number = 0, thousands: boolean = true)`
  - `format(rawValue: unknown): string` — `NaN`이면 `''`. `toFixed(decimals)` 적용 후
    `thousands`가 true면 정수부만 천단위 구분자 삽입
- 완료 조건:
  - `new NumberFormatter(1, true).format(1234.5)` → `'1,234.5'`
  - `new NumberFormatter(0, false).format(1234)` → `'1234'`

### T11. DateFormatter
- 파일: `packages/core/src/domain/format/DateFormatter.ts`
- 선행: T08
- 목표: ISO 날짜 문자열을 `'2026-08-25'`, `'2026년 8월 25일'` 등 지정 패턴으로 바꾼다.
- 구현:
  - `constructor(pattern: string)` — 패턴 토큰은 `YYYY`, `MM`, `DD`만 지원 (MVP 범위)
  - `format(rawValue: unknown): string` — `rawValue`가 문자열이 아니거나 `new Date(rawValue)`가
    `Invalid Date`면 `''`. 유효하면 토큰을 `String(...).padStart(2,'0')` 등으로 치환
  - **주의**: `domain`은 브라우저/Node API를 import하지 않는다는 규칙이 있지만
    `Date`는 ECMAScript 표준 전역 객체이므로 이 규칙의 예외로 둔다 (import 문이 없기 때문에
    규칙을 어기지 않는다 — "import 금지"는 외부 패키지·플랫폼 API에 대한 것이다)
- 완료 조건:
  - `new DateFormatter('YYYY-MM-DD').format('2026-08-25T00:00:00Z')` → `'2026-08-25'`
  - `new DateFormatter('YYYY년 MM월 DD일').format('2026-08-25')` → `'2026년 08월 25일'`
  - `.format('invalid')` → `''`

### T12. MaskFormatter + PlainTextFormatter
- 파일: `packages/core/src/domain/format/MaskFormatter.ts`, `packages/core/src/domain/format/PlainTextFormatter.ts`
- 선행: T08
- 목표: 주민등록번호·계좌번호처럼 민감한 값을 가려서 보여준다. `PlainTextFormatter`는
  아무 변환도 하지 않는 항등 포맷터로, `formatSpec`이 없는 필드의 기본값으로 쓰인다.
- 구현:
  - `MaskFormatter`: `constructor(keepHead: number = 0, keepTail: number = 0, maskChar: string = '*')`.
    `format(rawValue)`는 `String(rawValue)`로 바꾼 뒤 앞 `keepHead`자와 뒤 `keepTail`자를
    제외한 나머지를 `maskChar`로 치환
  - `PlainTextFormatter`: `format(rawValue)` → `rawValue == null ? '' : String(rawValue)`
- 완료 조건:
  - `new MaskFormatter(6, 1).format('9004171234567')` → `'900417******7'`
  - `new PlainTextFormatter().format(42)` → `'42'`, `.format(null)` → `''`

### T13. FormatterRegistry (Factory)
- 파일: `packages/core/src/domain/format/FormatterRegistry.ts`
- 선행: T09, T10, T11, T12
- 목표: `FormatSpec` 데이터를 실제 `ValueFormatter` 인스턴스로 바꾼다. **`kind`로 분기하는
  코드는 이 파일 안에만 존재해야 한다** — 다른 곳에서 `formatSpec.kind`로 분기하는 코드를
  발견하면 이 클래스를 안 쓰고 있다는 뜻이다.
- 구현:
  - `static create(spec: FormatSpec | null): ValueFormatter` — static 메서드 (Factory 패턴).
    `spec`이 `null`이면 `new PlainTextFormatter()`. 아니면 `spec.kind`에 따라 T09~T12의
    클래스를 생성해 반환. 알 수 없는 `kind`면 예외
- 완료 조건: `FormatSpec` 5종류 각각에 대해 `FormatterRegistry.create(spec)`이 올바른
  클래스의 인스턴스를 반환하는지 `instanceof`로 확인하는 테스트 5개.

---
## Phase 3 — Domain: 요소 (Element 계층 + Visitor)

캔버스에 놓이는 모든 것(텍스트, 필드, 표, 이미지, 도형, 서명란)이 `Element`를 상속한다.
요소 종류 × 렌더러 종류(지금은 PDF뿐이지만 늘어날 수 있다)의 조합이 늘어나도
**요소를 하나 추가하면 컴파일 에러로 빠뜨린 처리를 알려주는** 구조를 Visitor로 만든다.

### T14. Element 추상 클래스 + ElementVisitor 인터페이스
- 파일: `packages/core/src/domain/element/Element.ts`, `packages/core/src/domain/element/ElementVisitor.ts`
- 선행: T03
- 목표: 모든 요소가 공통으로 갖는 것(위치, 순서, 잠금)과, 렌더러가 요소 종류별 처리를
  빠짐없이 구현하도록 강제하는 인터페이스를 정의한다.
- 구현:
  - `ElementVisitor.ts` 먼저 작성 (T17~T23에서 만들 7개 클래스를 미리 이름으로만 참조):
    ```ts
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
  - `Element.ts`: `export abstract class Element` — 필드 `readonly id: string`,
    `readonly frame: Frame`, `readonly z: number`, `readonly locked: boolean`.
    생성자로 4개 다 받음. 메서드:
    - `abstract accept<T>(visitor: ElementVisitor<T>): T` — 하위 클래스가 반드시 구현
    - `withFrame(frame: Frame): Element` — abstract. "자기 자신과 같은 종류인데 frame만
      바꾼 새 인스턴스"를 반환해야 한다 (T50 `TransformElementCommand`가 사용)
- 완료 조건: 아직 하위 클래스가 없으므로 컴파일 통과 여부만 확인. T17 완료 시점에
  `TextElement`가 이 계약을 실제로 지키는지로 검증된다.

### T15. Content — 텍스트/템플릿 문자열 처리
- 파일: `packages/core/src/domain/element/Content.ts`, `packages/core/src/domain/element/TemplateExpression.ts`
- 선행: T06
- 목표: `TextElement`에 들어가는 문자열은 고정 텍스트("임금명세서")일 수도, `"{{employee.name}} 님"`
  처럼 데이터가 섞인 문자열일 수도 있다. **절대 `eval`이나 `new Function`을 쓰지 않고**
  안전하게 치환한다 (템플릿은 신뢰할 수 없는 입력으로 취급한다 — 담당자가 실수로
  이상한 문자열을 넣어도 코드가 실행되면 안 된다).
- 구현:
  - `TemplateExpression.ts`: `export class TemplateExpression` —
    `static render(text: string, data: unknown): string` static 메서드.
    정규식 `/\\{\\{\\s*([\\w.]+)\\s*\\}\\}/g`로 `{{path}}` 부분만 찾아 `new DataPath(path).resolve(data)`
    결과로 치환. 값이 `undefined`/`null`이면 빈 문자열로. `String(value)`로 문자열화
  - `Content.ts`: 판별 유니온 `type Content = { kind: 'literal'; value: string } | { kind: 'template'; value: string }`
    그리고 이를 다루는 클래스 `ContentResolver`(또는 `Content` 자체를 값객체 클래스로 만들어도
    되지만, 여기서는 순수 데이터+별도 resolver로 분리):
    - `static resolve(content: Content, data: unknown): string` — `kind`가 `'literal'`이면
      `content.value` 그대로, `'template'`이면 `TemplateExpression.render(content.value, data)`
- 완료 조건:
  - `TemplateExpression.render('{{a.b}} 님', {a:{b:'김정환'}})` → `'김정환 님'`
  - `TemplateExpression.render('{{x.y}}', {})` → `''` (예외 없이 빈 문자열)
  - 문자열에 `{{`나 `}}`가 없으면 원본 그대로 반환

### T16. TextElement
- 파일: `packages/core/src/domain/element/TextElement.ts`
- 선행: T14, T15, T05
- 목표: 고정 문구나 데이터가 섞인 문구를 표시하는 가장 단순한 요소.
- 구현:
  - `export class TextElement extends Element`
  - 추가 필드: `readonly content: Content`, `readonly style: TextStyle`
  - `accept<T>(visitor: ElementVisitor<T>): T { return visitor.visitText(this); }`
  - `withFrame(frame: Frame): TextElement { return new TextElement(this.id, frame, this.z, this.locked, this.content, this.style); }`
- 완료 조건: 인스턴스를 만들고 `accept({ visitText: (e) => 'ok', ...나머지는 fail로 } as any)`를
  호출했을 때 `visitText`가 호출되는지 확인 (Visitor 배선이 맞는지 검증하는 최소 테스트).

### T17. FieldElement
- 파일: `packages/core/src/domain/element/FieldElement.ts`
- 선행: T14, T07, T05
- 목표: 데이터베이스의 값 하나(급여액, 성명 등)를 그대로 표시하는 요소. `TextElement`와
  분리한 이유는 "이 자리가 데이터와 연결돼 있다"는 사실 자체가 에디터에서 하이라이트·검증
  대상이 되기 때문이다.
- 구현:
  - `export class FieldElement extends Element`
  - 추가 필드: `readonly binding: Binding`, `readonly style: TextStyle`
  - `accept`, `withFrame` — T16과 동일한 패턴
- 완료 조건: T16과 동일한 방식의 Visitor 배선 테스트.

### T18. TableColumn + TableElement
- 파일: `packages/core/src/domain/element/TableColumn.ts`, `packages/core/src/domain/element/TableElement.ts`,
  `packages/core/src/domain/element/TableSource.ts`
- 선행: T14, T07, T05, T15
- 목표: 급여 항목처럼 **행 수가 사람마다 다른** 반복 영역. 고정 좌표만으로는 표현할 수 없어
  전체 설계에서 반드시 필요하다고 판단한 요소다.
- 구현:
  - `TableColumn` (값 객체): 필드 `key: string`, `header: string`, `cellTemplate: string`
    (예: `'{{row.name}}'` — **행 스코프에서만** 데이터를 참조한다, 바깥 데이터는 못 봄.
    MVP 단순화 결정), `width: number`(mm), `align: 'left'|'center'|'right'`,
    `formatSpec: FormatSpec | null`
  - Phase 9 사용성 보강에서 표의 행 공급 책임을 `TableSource` Strategy로 확장한다.
    `StaticTableSource`는 템플릿에 고정 행을 저장하고, `BoundTableSource`는 기존 `Binding`이
    가리키는 배열을 행으로 해석한다.
  - `TableElement extends Element`: 추가 필드 `source: TableSource`,
    `columns: TableColumn[]`, `rowHeight: number`(mm), `headerStyle: TextStyle`,
    `cellStyle: TextStyle`, `showHeader: boolean`, `overflow: 'clip'`
    (`'newPage'`는 v1. MVP는 `'clip'`만 존재해도 되지만 필드 자체는 미래를 위해 남겨둔다)
  - `accept` → `visitor.visitTable(this)`, `withFrame` 동일 패턴
  - 셀 값을 만드는 로직(`renderCell(column, rowData): string`)은 이 클래스에 넣지 않는다 —
    렌더링은 renderer 레이어(T43)의 책임이다. `TableElement`는 데이터 구조만 갖는다
- 완료 조건: Visitor 배선 테스트 + `TableColumn` 필드 보관 + 두 Source의 행 해석과 불변성 확인.

### T19. ImageElement
- 파일: `packages/core/src/domain/element/ImageElement.ts`
- 선행: T14, T07
- 목표: 로고(고정 이미지) 또는 데이터에서 오는 이미지(서명 이미지 등)를 표시.
- 구현: 추가 필드 `assetId?: string`(고정 이미지 참조), `binding?: Binding`(데이터 기반),
  `fit: 'contain'|'cover'|'stretch'`. 둘 다 없거나 둘 다 있으면 생성자에서 예외
  ("이미지는 assetId 또는 binding 중 하나만 가져야 한다"). `accept` → `visitImage`.
- 완료 조건: `assetId`와 `binding`을 동시에 주면 예외, 둘 다 안 주면 예외, 하나만 주면 정상 생성.

### T20. BoxElement, LineElement
- 파일: `packages/core/src/domain/element/BoxElement.ts`, `packages/core/src/domain/element/LineElement.ts`
- 선행: T14
- 목표: 표 구분선, 강조 배경 등 장식용 도형. 데이터 바인딩이 없는 가장 단순한 요소.
- 구현:
  - `BoxElement`: `fill?: string`, `stroke?: string`, `strokeWidth?: number`(mm), `radius?: number`(mm).
    `accept` → `visitBox`
  - `LineElement`: `stroke: string`, `strokeWidth: number`(mm), `dash?: number[]`.
    `accept` → `visitLine`
- 완료 조건: 각각 생성 후 필드 보관 확인 + Visitor 배선 테스트.

### T21. SignatureElement
- 파일: `packages/core/src/domain/element/SignatureElement.ts`
- 선행: T14
- 목표: 서명이 들어갈 자리. 발행 시점에는 항상 비어 있고, 서명 단계(T39)에서 채워진다는
  것을 기억하기 위해 별도 요소로 둔다.
- 구현: 추가 필드 `signer: string`(서명자 식별자, MVP는 `'employee'` 고정값 하나만 씀),
  `required: boolean = true`, `label?: string`. `accept` → `visitSignature`.
- 완료 조건: Visitor 배선 테스트.

### T22. ElementFactory (JSON ↔ Element 역직렬화)
- 파일: `packages/core/src/domain/element/ElementFactory.ts`
- 선행: T16~T21 전부
- 목표: 저장된 템플릿 JSON을 불러올 때 `{ type: 'text', ... }` 형태의 순수 데이터를
  실제 `TextElement` 같은 클래스 인스턴스로 되돌린다. **`type`으로 분기하는 코드는
  이 파일에만 있어야 한다** (T13의 원칙과 동일한 이유).
- 구현:
  - 각 Element 하위 클래스에 `toJSON(): Record<string, unknown>` 메서드를 추가한다
    (T16~T21로 돌아가서 추가해야 함 — 이 작업 시작 전에 반영)
  - `ElementFactory.fromJSON(json: Record<string, unknown>): Element` — static 메서드.
    `json.type` 값으로 분기해 각 클래스의 생성자를 호출. 알 수 없는 `type`이면 예외
  - `ElementFactory.toJSON(element: Element): Record<string, unknown>` — `element.toJSON()`
    호출 + 공통 필드(`id`, `frame`, `z`, `locked`)와 `type` 태그를 덧붙임
  - Phase 9 표 확장 이후 `source`가 없는 기존 Table JSON의 `binding`은
    `BoundTableSource`로 복원한다. 정적·데이터 Source는 각각 왕복 테스트를 유지한다.
- 완료 조건: 7종 요소 각각에 대해 `fromJSON(toJSON(원본))`이 원본과 필드가 전부 같은지
  확인하는 **왕복(round-trip) 테스트** 7개. 이게 통과하지 않으면 저장·불러오기가 깨진다.

---
## Phase 4 — Domain: 템플릿 엔티티

### T23. Template 엔티티
- 파일: `packages/core/src/domain/template/Template.ts`
- 선행: T22, T04
- 목표: 요소들의 모음을 관리하며, **발행(published)된 버전은 절대 수정할 수 없다**는
  규칙을 코드로 강제한다. 이 규칙이 없으면 "동결" 원칙 전체가 무너진다.
- 구현:
  - 필드: `readonly schemaVersion: 1`(항상 리터럴 1 — T24 이후 스키마가 바뀌면 2로 올리고
    마이그레이션 함수를 추가하지, 이 필드 자체를 지우지 않는다), `readonly id: string`,
    `readonly name: string`, `readonly version: number`, `readonly status: 'draft'|'published'|'archived'`,
    `readonly page: PageSpec`, `readonly fonts: string[]`, `private readonly elements: Element[]`,
    `readonly createdAt: string`, `readonly updatedAt: string`
  - `getElements(): readonly Element[]` — 내부 배열의 얕은 복사를 반환 (호출자가 원본을
    변형하지 못하게)
  - `addElement(element: Element): Template` — `status !== 'draft'`면
    `throw new Error('발행된 템플릿은 수정할 수 없다. createNextVersion()으로 새 버전을 만들어라')`.
    통과하면 요소가 추가된 **새 Template 인스턴스**를 반환 (기존 인스턴스는 변경하지 않음 —
    엔티티라도 이 클래스는 불변 스타일을 따른다. 이렇게 해야 `CommandStack`의 undo가 쉬워진다)
  - `removeElement(id: string): Template` — 동일한 draft 검사 후 새 인스턴스 반환
  - `replaceElement(id: string, updater: (element: Element) => Element): Template` — 동일한
    draft 검사 후, 해당 id를 찾아 `updater`를 적용한 새 인스턴스 반환. id를 못 찾으면 예외
  - `publish(): Template` — `status`가 `'draft'`가 아니면 예외. `status: 'published'`로 바꾼
    새 인스턴스 반환. **검증은 이 메서드가 하지 않는다** — 검증은 T24 `TemplateValidator`의
    책임이고, `publish()`를 호출하는 쪽(T35 `TemplateService`)이 먼저 검증을 통과시켜야 한다
  - `createNextVersion(): Template` — `version + 1`, `status: 'draft'`, 요소는 그대로 복사한
    새 인스턴스 반환 (발행된 템플릿을 고치고 싶을 때 쓰는 유일한 경로)
- 완료 조건:
  - draft 상태에서 `addElement` → 성공, 반환된 인스턴스에 요소가 늘어나 있음, **원본은 그대로**
  - published 상태에서 `addElement` 호출 → 예외
  - `publish()` 후 상태가 `'published'`로 바뀐 새 인스턴스 반환, 원본은 여전히 `'draft'`
  - `createNextVersion()` → `version`이 1 증가하고 `status`가 `'draft'`로 돌아옴

### T24. TemplateValidator
- 파일: `packages/core/src/domain/template/TemplateValidator.ts`
- 선행: T23
- 목표: 발행하기 전 구조적 결함을 잡는다. MVP는 아래 3가지만 검사한다
  (근로기준법 필수 항목 검사 같은 도메인 규칙은 v1로 미룬다).
- 구현:
  - `class ValidationError { constructor(readonly elementId: string | null, readonly message: string) {} }`
  - `class TemplateValidator`: `validate(template: Template): ValidationError[]` — 아래를 검사:
    1. 요소가 하나도 없으면 `ValidationError(null, '요소가 하나도 없다')`
    2. 요소 `id`가 중복되면 각 중복 건마다 에러
    3. `FieldElement`/`TableElement`의 `binding.path`가 빈 문자열이면 에러
       (T06에서 이미 생성자가 빈 문자열을 막았으므로 사실상 도달하지 않을 수 있지만,
       방어적으로 한 번 더 확인 — "이중 검증"이 아니라 "이 계층은 이 계층의 규칙을
       스스로 보장한다"는 원칙)
  - 에러가 하나도 없으면 빈 배열 반환 (발행 가능)
- 완료 조건: 요소 0개 → 에러 1개, id 중복 2개 → 에러 2개, 정상 템플릿 → 빈 배열.

### T25. BindingResolver
- 파일: `packages/core/src/domain/template/BindingResolver.ts`
- 선행: T07, T13
- 목표: `Binding` 설정과 실제 데이터를 받아 **최종 표시 문자열**을 만든다. `Binding`이
  스스로 이 일을 하지 않는 이유(T07)를 실제로 구현하는 지점.
- 구현:
  - `class BindingResolver`: `resolve(binding: Binding, data: unknown): string` —
    1. `const rawValue = binding.path.resolve(data)`
    2. `rawValue`가 `undefined`/`null`이면: `binding.required`가 true → 예외
       (`new Error(`필수 필드 ${binding.path 원본 문자열}가 데이터에 없다`)` — 이 예외 메시지를
       위해 `DataPath`에 `toString(): string` 또는 원본 문자열을 보관하는 필드를 T06에 추가할 것),
       false → `binding.fallback ?? ''` 반환
    3. 값이 있으면 `FormatterRegistry.create(binding.formatSpec).format(rawValue)` 반환
- 완료 조건:
  - 값이 있는 경우 포맷터가 정상 적용되는지 (통화 바인딩 → `'3,800,000원'`)
  - 값이 없고 `required: false`, `fallback: '-'` → `'-'`
  - 값이 없고 `required: true` → 예외

---

## Phase 5 — Domain: 발행 문서 엔티티

### T26. DocumentHash
- 파일: `packages/core/src/domain/document/DocumentHash.ts`
- 선행: T02
- 목표: PDF 바이트의 SHA-256 해시값을 감싸는 값 객체. **해시 계산 자체는 domain이 하지
  않는다** (Node의 `crypto`는 플랫폼 API이므로 domain에서 import 금지). 계산은 T34
  `HashProvider` 포트가 하고, 이 클래스는 결과 문자열을 안전하게 다루기만 한다.
- 구현:
  - `constructor(private readonly hex: string)` — 생성자에서 `/^[0-9a-f]{64}$/.test(hex)`
    아니면 예외 (SHA-256 hex는 항상 64자)
  - `equals(other: DocumentHash): boolean`
  - `toHex(): string`
- 완료 조건: 올바른 형식의 문자열 → 정상 생성, 짧거나 대문자 섞인 문자열 → 예외,
  같은 값 두 개 `equals` true.

### T27. SignatureRecord, AuditEntry
- 파일: `packages/core/src/domain/document/SignatureRecord.ts`, `packages/core/src/domain/document/AuditEntry.ts`
- 선행: T26
- 목표: 서명 1건과 감사로그 1건을 표현하는 값 객체. `IssuedDocument`가 이들을 배열로 갖는다.
- 구현:
  - `SignatureRecord`: 필드 `signer: string`, `signerId: string`, `signedAt: string`,
    `documentHash: DocumentHash`, `strokes: ReadonlyArray<{points: ReadonlyArray<readonly [number, number, number?]>}>`,
    `imagePng: string`(base64), `authMethod: 'email_link'|'sms_otp'|'sso'|'none'`, `ip?: string`,
    `userAgent?: string`. 생성자에서 `strokes.length === 0 && imagePng === ''`이면 예외
    ("서명 흔적이 전혀 없다")
  - `AuditEntry`: 필드 `at: string`, `actor: string`,
    `action: 'issue'|'view'|'sign'|'download'|'void'|'token_issued'`, `ip?: string`,
    `userAgent?: string`, `meta?: Record<string, unknown>`
- 완료 조건: 각각 생성자 필드 보관 확인, `SignatureRecord`는 스트로크·이미지 둘 다 없을 때 예외.

### T28. IssuedDocument 엔티티
- 파일: `packages/core/src/domain/document/IssuedDocument.ts`
- 선행: T27
- 목표: 발행된 문서 1건. **상태 전이 규칙을 강제하는 것이 이 클래스의 유일한 존재
  이유다.** 아무 상태에서나 서명을 추가하거나 취소할 수 있으면 감사로그가 무의미해진다.
- 구현:
  - 필드: `readonly id`, `readonly templateId`, `readonly templateVersion: number`,
    `readonly recipientId`, `readonly status: 'issued'|'viewed'|'signed'|'voided'`,
    `readonly dataSnapshot: unknown`, `readonly pdf: {storageKey: string; sha256: DocumentHash; bytes: number}`,
    `readonly issuedAt`, `readonly issuedBy`, `private readonly signatures: SignatureRecord[]`,
    `private readonly auditLog: AuditEntry[]`
  - `static issue(params: {...}): IssuedDocument` — static factory. `status: 'issued'`로 생성,
    `auditLog`에 `action: 'issue'` 항목 1개 포함
  - `markViewed(actor: string, ip?: string, userAgent?: string): IssuedDocument` —
    `status`가 `'issued'`일 때만 `'viewed'`로 전이하는 새 인스턴스 반환.
    이미 `'viewed'`/`'signed'`면 상태는 안 바꾸되 감사로그(`action: 'view'`)는 추가
    (조회는 여러 번 있을 수 있으니까). `'voided'`면 예외
  - `addSignature(record: SignatureRecord): IssuedDocument` —
    1. `status === 'voided'`면 예외
    2. `record.documentHash.equals(this.pdf.sha256)`가 false면
       `throw new Error('서명 대상 해시가 발행된 문서와 다르다 — 변조 의심')`
       **이 검사가 이 프로젝트에서 가장 중요한 한 줄이다.**
    3. `signatures`에 추가, `status: 'signed'`로 전이, 감사로그(`action: 'sign'`) 추가한
       새 인스턴스 반환
  - `void(actor: string, reason: string): IssuedDocument` — `status: 'voided'`로 전이,
    감사로그(`action: 'void'`, `meta: {reason}`) 추가. 이미 voided면 예외
  - `getSignatures(): readonly SignatureRecord[]`, `getAuditLog(): readonly AuditEntry[]` — 읽기 전용 접근
- 완료 조건:
  - `issue()` → `status: 'issued'`, `auditLog.length === 1`
  - `markViewed()` → `status: 'viewed'`
  - 해시가 다른 `SignatureRecord`로 `addSignature()` → 예외 (**반드시 이 테스트를 짤 것**)
  - 해시가 같은 `SignatureRecord`로 `addSignature()` → `status: 'signed'`
  - `voided` 상태에서 `addSignature()` 또는 `markViewed()` → 둘 다 예외

---
## Phase 6 — Application: 포트 (인터페이스만 정의)

여기서부터는 `application` 레이어다. **포트는 인터페이스일 뿐 구현체가 없다.** 구현은
`renderer`(T40~T44)와 `apps/admin/adapters`(T68~T72)에서 한다. 이 구간은 전부 타입
정의라 런타임 테스트가 없다 — `npx tsc` 통과가 완료 조건이다.

### T29. TemplateStore, DocumentStore
- 파일: `packages/core/src/application/port/TemplateStore.ts`, `packages/core/src/application/port/DocumentStore.ts`
- 선행: T23, T28
- 목표: 템플릿과 발행문서를 어디에 저장하는지 라이브러리는 모른다. 이 인터페이스만 안다.
- 구현:
  ```ts
  export interface TemplateStore {
    get(id: string, version?: number): Promise<Template>;
    save(template: Template): Promise<void>;
    publish(id: string, version: number): Promise<void>;
    listVersions(id: string): Promise<ReadonlyArray<Pick<Template, 'id'|'version'|'status'|'updatedAt'>>>;
  }
  export interface DocumentStore {
    create(document: IssuedDocument): Promise<void>;
    get(id: string): Promise<IssuedDocument>;
    update(document: IssuedDocument): Promise<void>;
  }
  ```
  (원래 `appendAudit`/`addSignature`를 별도 메서드로 뒀던 초기 설계보다 `update`로 단순화 —
  `IssuedDocument`가 불변 스타일이라 "새 상태 전체를 저장"하는 게 더 일관적이다)
- 완료 조건: `npx tsc -p packages/core` 통과.

### T30. DataProvider
- 파일: `packages/core/src/application/port/DataProvider.ts`
- 선행: T02
- 목표: 미리보기와 발행에 쓸 데이터를 호스트로부터 받아온다.
  연결 가능한 필드 목록은 **호스트가 주지 않는다** — 템플릿의 `variables`가 유일한 근거다.
- 구현:
  ```ts
  export interface DataProvider {
    sample(templateId: string): Promise<unknown>;         // 미리보기용, 반드시 마스킹된 값
    resolve(templateId: string, recipientId: string): Promise<unknown>;  // 발행용 실제 데이터
  }
  ```
- 완료 조건: `npx tsc` 통과.

### T31. StorageAdapter, FontProvider, ImageProvider, AuthAdapter
- 파일: `packages/core/src/application/port/StorageAdapter.ts`, `.../FontProvider.ts`,
  `.../ImageProvider.ts`, `.../AuthAdapter.ts`
- 선행: T02
- 목표: PDF 바이트 저장, 폰트 파일 공급, 배포 토큰 발급·검증을 각각 분리한 포트.
- 구현:
  ```ts
  export interface StorageAdapter {
    put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
    get(key: string): Promise<Uint8Array>;
  }
  export interface FontProvider {
    load(family: string, weight: number): Promise<Uint8Array>;  // TTF 바이트
  }
  export interface ImageAsset {
    readonly bytes: Uint8Array;
    readonly mediaType: 'image/png' | 'image/jpeg';
  }
  export interface ImageProvider {
    load(assetId: string): Promise<ImageAsset>;
  }
  export interface AuthAdapter {
    issueToken(documentId: string, recipientId: string, ttlSeconds: number): Promise<string>;
    verifyToken(token: string): Promise<{documentId: string; recipientId: string}>;
  }
  ```
- 완료 조건: `npx tsc` 통과.

### T32. DocumentRenderer, HashProvider
- 파일: `packages/core/src/application/port/DocumentRenderer.ts`, `.../HashProvider.ts`
- 선행: T23
- 목표: "템플릿+데이터 → PDF 바이트"를 포트로 선언해, `application` 레이어가 pdf-lib 같은
  구체 기술을 몰라도 되게 한다.
- 구현:
  ```ts
  export type RenderMode = 'preview' | 'authoritative';
  export interface DocumentRenderer {
    render(template: Template, data: unknown, mode: RenderMode): Promise<Uint8Array>;
  }
  export interface HashProvider {
    sha256(bytes: Uint8Array): Promise<string>;   // hex 문자열, DocumentHash 생성 재료
  }
  ```
- 완료 조건: `npx tsc` 통과.

---

## Phase 7 — Application: 서비스 (유스케이스)

서비스는 포트와 도메인 객체를 조율할 뿐 **구체 기술을 직접 다루지 않는다.**
생성자에 필요한 포트를 주입받는다 (DI 컨테이너 없이, 그냥 생성자 인자로).

### T33. TemplateService
- 파일: `packages/core/src/application/service/TemplateService.ts`
- 선행: T29, T24
- 목표: 템플릿 저장·발행을 조율하고, **발행 직전에 반드시 검증을 거치도록** 강제한다.
- 구현:
  - `constructor(private readonly store: TemplateStore, private readonly validator: TemplateValidator)`
  - `async save(template: Template): Promise<void>` — `this.store.save(template)` 호출만
    (draft 상태에서 자유롭게 저장 가능, 검증은 안 함 — 작업 중인 초안까지 막을 필요는 없다)
  - `async publish(id: string, version: number): Promise<void>` —
    1. `const template = await this.store.get(id, version)`
    2. `const errors = this.validator.validate(template)`
    3. `errors.length > 0`이면 `throw new Error(errors.map(e => e.message).join('; '))`
    4. `await this.store.publish(id, version)`
- 완료 조건: `TemplateStore`를 최소 스텁(인메모리 배열)으로 만들어 —
  검증 실패하는 템플릿으로 `publish()` 호출 시 예외 + `store.publish`가 호출되지 않음을 확인,
  정상 템플릿은 `store.publish`가 정확한 인자로 호출됨을 확인 (호출 여부는 Vitest의
  `vi.fn()`으로 스텁을 만들어 검증).

### T34. PreviewService
- 파일: `packages/core/src/application/service/PreviewService.ts`
- 선행: T30, T32
- 목표: 담당자가 캔버스에서 "미리보기" 버튼을 눌렀을 때 호출되는 서비스.
  **항상 `'preview'` 모드로만 렌더한다** — 이 서비스는 `'authoritative'`를 호출할 방법이
  없다 (T35와 클래스 자체가 분리돼 있는 이유).
- 구현:
  - `constructor(private readonly renderer: DocumentRenderer, private readonly dataProvider: DataProvider)`
  - `async renderPreview(template: Template): Promise<Uint8Array>`:
    1. `const sampleData = await this.dataProvider.sample(template.id)`
    2. `return this.renderer.render(template, sampleData, 'preview')`
- 완료 조건: 스텁 `renderer.render`가 `'preview'` 인자로 호출되는지 확인.

### T35. IssuanceService — 동결 파이프라인 (가장 중요한 서비스)
- 파일: `packages/core/src/application/service/IssuanceService.ts`
- 선행: T29, T30, T31, T32, T28, T26
- 목표: "템플릿이 발행 상태인지 확인 → 실제 데이터 조회 → 서버 렌더 → 해시 계산 →
  저장 → 동결된 `IssuedDocument` 생성"까지 **한 번에 끝나는 원자적 흐름**을 만든다.
  이 서비스가 곧 "동결" 원칙의 실제 구현체다.
- 구현:
  - `constructor(` 아래 6개 포트/서비스를 순서대로 주입받음: `templateStore: TemplateStore`,
    `dataProvider: DataProvider`, `renderer: DocumentRenderer`, `storage: StorageAdapter`,
    `documentStore: DocumentStore`, `hashProvider: HashProvider` `)`
  - `async issue(templateId: string, recipientId: string, issuedBy: string): Promise<IssuedDocument>`:
    1. `const template = await this.templateStore.get(templateId)` — **버전을 지정하지
       않으면 저장소가 최신 published 버전을 반환해야 한다** (T29 구현 시 이 계약을 지킬 것)
    2. `template.status !== 'published'`면 `throw new Error('발행되지 않은 템플릿은 발행할 수 없다')`
    3. `const data = await this.dataProvider.resolve(templateId, recipientId)`
    4. `const pdfBytes = await this.renderer.render(template, data, 'authoritative')`
    5. `const hashHex = await this.hashProvider.sha256(pdfBytes)`
    6. `const storageKey = \`documents/${templateId}/${recipientId}/${Date.now()}.pdf\`` —
       **주의**: `Date.now()`를 도메인이 아니라 이 서비스(application, infrastructure에
       가까운 조율 지점)에서 쓰는 것은 허용하되, 순수 domain 클래스에서는 절대 쓰지 않는다.
       실제 구현 시 `storageKey` 생성 규칙은 호스트가 원한다면 옵션으로 주입받을 수도 있음
       (MVP는 고정 규칙으로 시작)
    7. `await this.storage.put(storageKey, pdfBytes, 'application/pdf')`
    8. `const document = IssuedDocument.issue({ id: crypto.randomUUID(), templateId, templateVersion: template.version, recipientId, dataSnapshot: data, pdf: { storageKey, sha256: new DocumentHash(hashHex), bytes: pdfBytes.length }, issuedAt: new Date().toISOString(), issuedBy })`
    9. `await this.documentStore.create(document)`
    10. `return document`
- 완료 조건 (스텁 기반 통합 테스트):
  - draft 상태 템플릿으로 `issue()` 호출 → 예외, `storage.put`/`documentStore.create` 호출 안 됨
  - published 템플릿 → 반환된 `IssuedDocument.status === 'issued'`,
    `storage.put`이 정확히 1번, `documentStore.create`가 정확히 1번 호출됨
  - 반환된 문서의 `pdf.sha256`이 `hashProvider.sha256`이 반환한 값과 일치

### T36. DistributionService
- 파일: `packages/core/src/application/service/DistributionService.ts`
- 선행: T29, T31
- 목표: 발행된 문서 1건에 대해 1회용 단기 만료 링크를 만든다.
- 구현:
  - `constructor(private readonly documentStore: DocumentStore, private readonly auth: AuthAdapter)`
  - `async createLink(documentId: string, ttlSeconds: number = 60 * 60 * 24 * 7): Promise<string>`:
    1. `const document = await this.documentStore.get(documentId)`
    2. `document.status === 'voided'`면 예외
    3. `const token = await this.auth.issueToken(documentId, document.recipientId, ttlSeconds)`
    4. 토큰 발급 감사로그를 남기려면 `documentStore.update(...)`가 필요하지만, MVP는
       `AuthAdapter` 구현체가 자체적으로 토큰 발급 로그를 남긴다고 가정하고 여기서는
       생략 가능 (v1에서 `documentStore.update`로 `AuditEntry` 추가하는 방식으로 보강)
    5. `return token` (URL 조합은 호스트가 함 — 이 서비스는 base URL을 모른다)
- 완료 조건: `documentStore.get`이 voided 문서를 반환하면 예외, 아니면 `auth.issueToken`이
  올바른 인자로 호출되고 그 반환값이 그대로 나오는지 확인.

### T37. SigningService
- 파일: `packages/core/src/application/service/SigningService.ts`
- 선행: T29, T31, T27
- 목표: 토큰으로 문서를 열람하고, 서명을 접수해 `IssuedDocument.addSignature`의 변조 검사를
  실제로 거치게 만드는 진입점.
- 구현:
  - `constructor(private readonly documentStore: DocumentStore, private readonly auth: AuthAdapter, private readonly storage: StorageAdapter)`
  - `async view(token: string, ip?: string, userAgent?: string): Promise<{document: IssuedDocument; pdfBytes: Uint8Array}>`:
    1. `const {documentId} = await this.auth.verifyToken(token)`
    2. `let document = await this.documentStore.get(documentId)`
    3. `document = document.markViewed(document.recipientId, ip, userAgent)`
    4. `await this.documentStore.update(document)`
    5. `const pdfBytes = await this.storage.get(document.pdf.storageKey)`
    6. `return {document, pdfBytes}`
  - `async sign(token: string, signaturePayload: {strokes: ...; imagePng: string; authMethod: ...; ip?: string; userAgent?: string}): Promise<IssuedDocument>`:
    1. `const {documentId, recipientId} = await this.auth.verifyToken(token)`
    2. `const document = await this.documentStore.get(documentId)`
    3. `const record = new SignatureRecord({ signer: 'employee', signerId: recipientId, signedAt: new Date().toISOString(), documentHash: document.pdf.sha256, ...signaturePayload })` —
       **`documentHash`를 클라이언트가 보낸 값이 아니라 서버가 갖고 있는 `document.pdf.sha256`을
       그대로 쓴다.** 클라이언트가 해시를 보내게 하면 그 값을 위조할 수 있기 때문이다
    4. `const signed = document.addSignature(record)` — 여기서 T28의 변조 검사가 실행된다
       (사실 3번에서 이미 같은 해시를 넣었으므로 이 경로에서는 항상 통과하지만, 검사
       로직 자체는 도메인에 남아있어야 한다 — 방어의 이중화가 아니라 **책임의 소재**를
       도메인에 두는 것)
    5. `await this.documentStore.update(signed)`
    6. `return signed`
- 완료 조건: `view()` 호출 후 `documentStore.update`가 `status: 'viewed'`인 문서로 호출되는지,
  `sign()` 호출 후 `status: 'signed'`인 문서로 호출되는지 스텁으로 확인.

---
## Phase 8 — Renderer: PDF 생성 (infrastructure)

여기서부터 `pdf-lib`, `subset-font` 같은 구체 기술이 처음 등장한다. `application`이
정의한 `DocumentRenderer` 포트를 실제로 구현하는 구간이다.

### T38. `@report-tool/renderer` 패키지 초기화 + 의존성
- 파일: `packages/renderer/package.json`, `packages/renderer/tsconfig.json`
- 선행: T02
- 목표: T02와 같은 이유로, 이 패키지가 성립해야 이후 작업이 가능하다.
- 구현:
  - `npm i pdf-lib @pdf-lib/fontkit subset-font` (workspace 루트에서, `-w packages/renderer` 옵션으로
    해당 패키지 종속성으로 등록)
  - `package.json`에 `"@report-tool/core": "workspace:*"` 의존성 추가 (npm workspaces 문법 확인 필요 —
    npm은 `"*"` 로 workspace 참조를 해석하므로 실제로는 `"@report-tool/core": "*"`로 적어도 된다.
    설치 후 `node_modules/@report-tool/core`가 심볼릭 링크로 잡히는지 확인)
  - `tsconfig.json`은 T02와 동일한 패턴
- 완료 조건: `npx tsc -p packages/renderer` 통과 (아직 소스가 없어 빈 컴파일이어도 됨).

### T39. UsedCharCollector
- 파일: `packages/renderer/src/font/UsedCharCollector.ts`
- 선행: T22, T25 (core의 Element, BindingResolver 사용)
- 목표: 문서에 실제로 등장하는 문자만 모아서 폰트 서브셋 대상을 최소화한다. 이게 없으면
  "폰트 1종당 2.4MB" 문제로 되돌아간다 (검증된 사실, [ARCHITECTURE.md 6.1](ARCHITECTURE.md#61-한글-폰트-서브셋-검증-완료) 참조).
- 구현:
  - `class UsedCharCollector implements ElementVisitor<string>` — 각 `visitX` 메서드가
    "이 요소를 그리는 데 필요한 문자들"을 문자열로 반환
    - `visitText(element)`: `Content.resolve(element.content, this.data)` 결과 문자열 그대로 반환
      (생성자에서 `private readonly data: unknown`, `private readonly bindingResolver: BindingResolver`를 주입받음)
    - `visitField(element)`: `this.bindingResolver.resolve(element.binding, this.data)` 반환
    - `visitTable(element)`: `element.binding.path.resolve(this.data)`로 배열을 얻고,
      각 행 × 각 컬럼의 `cellTemplate`을 `TemplateExpression.render(col.cellTemplate, {row})`로
      돌려 합친 문자열 + `column.header`들도 포함
    - `visitImage`, `visitBox`, `visitLine`: 빈 문자열 (텍스트 없음)
    - `visitSignature(element)`: `element.label ?? ''`
  - `collect(template: Template): string` (별도 public 메서드, Visitor 메서드가 아님) —
    `template.getElements()`를 순회하며 각 요소에 `accept(this)` 호출해 모은 문자열들을
    전부 이어붙인 뒤 `[...new Set(합친문자열)].join('')`으로 중복 제거
- 완료 조건: 텍스트 1개 + 필드 1개 + 표 1개(2행 2열)를 가진 가짜 Template으로
  `collect()` 호출 → 결과 문자열에 각 요소의 문자가 전부 포함되고 중복이 없는지 확인.

### T40. FontSubsetter
- 파일: `packages/renderer/src/font/FontSubsetter.ts`
- 선행: T38
- 목표: `@pdf-lib/fontkit`의 `subset: true`가 한글 글리프를 누락시키는 검증된 버그를
  피해 harfbuzz 기반으로 안전하게 서브셋한다.
- 구현:
  - `class FontSubsetter`: `async subset(rawFontBytes: Uint8Array, usedChars: string): Promise<Uint8Array>` —
    내부에서 `subsetFont(rawFontBytes, usedChars, { targetFormat: 'truetype' })` 호출 (라이브러리는
    `subset-font`, `apps/poc/subset2.mjs`에서 이미 검증된 호출 형태 그대로 옮긴다)
  - `usedChars`가 빈 문자열이면 원본을 그대로 반환 (서브셋할 게 없음)
- 완료 조건: `apps/poc/subset2.mjs`를 참고해 실제 Pretendard TTF로 서브셋한 결과가
  원본보다 작고(`subsetBytes.length < rawFontBytes.length`), `pdf-lib`로 임베딩했을 때
  지정한 문자들이 전부 정상 렌더되는지 **눈으로 직접 확인** (PDF를 PNG로 렌더해서 본다 —
  이 프로젝트에서 실제로 버그를 찾아낸 방법과 동일).

### T41. TextLayout
- 파일: `packages/core/src/domain/text/TextLayout.ts`
  (N02에서 renderer의 `PdfTextLayout`을 core로 옮겼다 — 캔버스와 PDF가 함께 쓴다)
- 선행: T05 (TextStyle)
- 목표: 텍스트가 박스 폭을 넘칠 때 `TextStyle.overflow` 설정대로 줄바꿈/축소/말줄임 처리.
- 구현:
  - `class TextLayout`: `layout(text: string, style: TextStyle, maxWidthMm: number, measureWidth: (text: string, size: number) => number): {lines: string[]; fontSize: number}` —
    `measureWidth`는 pdf-lib의 `font.widthOfTextAtSize`를 감싼 콜백으로 주입받는다
    (이 클래스가 pdf-lib 타입에 직접 의존하지 않도록 하는 최소한의 격리)
    - `overflow === 'wrap'`: 공백 기준으로 단어를 쌓다가 `maxWidthMm`(pt로 환산)을 넘기면 줄바꿈
    - `overflow === 'shrink'`: 한 줄로 고정, `measureWidth(text, style.size)`가 `maxWidthMm`를
      넘으면 `style.scaledBy(0.95)`를 반복 적용해 넘지 않을 때까지 축소 (최소 폰트 크기 6pt에서 중단)
    - `overflow === 'truncate'`: 넘치면 뒤에서부터 잘라내고 `'…'`을 붙여 넘지 않을 때까지 반복
- 완료 조건: 넉넉한 폭에서는 원문 그대로 1줄 반환, 좁은 폭 + `wrap`이면 2줄 이상으로 분리,
  좁은 폭 + `shrink`면 `fontSize`가 원래보다 작아짐, 좁은 폭 + `truncate`면 `'…'`으로 끝남.
  (측정 함수는 테스트에서 `(text, size) => text.length * size * 0.5` 같은 가짜로 대체 가능 —
  이 클래스는 pdf-lib 없이도 테스트할 수 있어야 한다)

### T42. PdfElementVisitor — 자간 이상 재검증 포함
- 파일: `packages/renderer/src/pdf/PdfElementVisitor.ts`
- 선행: T16~T21, T25, T40, T41
- 목표: 각 요소 종류를 실제 PDF 페이지에 그린다. **미해결로 남겨둔 하이픈 뒤 자간 이상
  현상을 여기서 재현하고 원인을 확정한다.**
- 구현:
  - `class PdfElementVisitor implements ElementVisitor<void>`: 생성자로
    `page: PDFPage`, `pageHeightMm: number`, `fonts: Map<string, PDFFont>`(굵기별),
    `data: unknown`, `bindingResolver: BindingResolver`, `textLayout: TextLayout` 주입
  - `visitText`/`visitField` 공통 로직을 `private drawTextBox(text: string, frame: Frame, style: TextStyle)`로
    뽑아 중복 제거. 내부에서 `frame.toPdfRect(this.pageHeightMm)`로 좌표 변환 후
    `page.drawText(...)` 호출. `align`에 따라 x 시작점을 `font.widthOfTextAtSize`로 보정
    (이 계산은 `apps/poc/font-poc.mjs`의 `text()` 헬퍼에 이미 있다 — 그대로 이식)
  - `visitTable`: 행을 순회하며 각 컬럼의 `cellTemplate`을 렌더링 후 `drawTextBox` 재사용,
    `rowHeight`만큼 y를 내려가며 그림. `overflow: 'clip'`이면 `frame.height`를 넘는 행은 그리지 않음
  - `visitBox`, `visitLine`: `page.drawRectangle`, `page.drawLine`
  - `visitImage`: `assetId` 또는 `binding`으로 얻은 이미지 바이트를 `pdfDoc.embedPng`/`embedJpg`로
    임베딩 후 `fit` 정책대로 크기 계산해 `page.drawImage`
  - `visitSignature`: 점선 테두리 박스 + `label` 텍스트 (서명 이미지 자체는 발행 단계에서는
    비어 있다 — 서명 완료 후 재렌더할 때만 실제 스트로크를 그림. MVP는 발행 시점 렌더만
    다루므로 빈 자리만 그리면 된다)
  - **자간 이상 재현 절차**: `apps/poc/font-poc.mjs`와 동일하게 `'ISU-20194'` 같은 하이픈 포함
    문자열을 그려보고 PNG로 렌더해 확대 검토. 원인이 될 후보 두 가지를 순서대로 배제한다:
    1. harfbuzz 서브셋이 하이픈(`-`) 글리프의 advance width를 잘못 계산하는지 —
       서브셋 없이(`subset: false`) 같은 문자열을 그려서 그래도 이상하면 서브셋 문제가 아님
    2. `qlmanage`(미리보기 도구) 자체의 렌더링 문제인지 — 같은 PDF를 Chrome의 PDF 뷰어나
       `pdftoppm`(poppler-utils) 등 다른 뷰어로도 열어서 비교
    원인이 확정되면 이 섹션에 결과를 기록하고(코드 주석 또는 이 문서 갱신), 실제
    문제라면 하이픈을 별도로 그리거나 폰트를 바꾸는 등 대응
- 완료 조건:
  - `apps/poc/font-poc.mjs`로 만들었던 임금명세서 전체를 이 Visitor로 다시 그렸을 때
    PoC와 동일한 결과가 나오는지 PNG 비교
  - 자간 이상의 원인을 확정하고 이 문서(T42 항목)에 결론을 한 줄로 남긴다

  **재검증 결론(2026-08-22)**: 원본 Pretendard와 harfbuzz 서브셋 폰트로 만든 PNG에서
  `ISU-20194` 간격이 동일했고, pdf-lib로 측정한 advance width도 소수점 5자리까지 같았다.
  따라서 서브셋 과정은 원인이 아니며 원본 Pretendard의 하이픈 advance/sidebearing 표현으로
  판단한다. MVP에서는 별도 보정을 하지 않는다.

### T43. PdfDocumentRenderer
- 파일: `packages/renderer/src/pdf/PdfDocumentRenderer.ts`
- 선행: T39, T40, T42, T32
- 목표: `DocumentRenderer` 포트의 실제 구현체. 폰트 로딩부터 서브셋, 페이지 생성,
  요소 그리기, `preview` 모드 워터마크까지 전체를 조율한다.
- 구현:
  - `class PdfDocumentRenderer implements DocumentRenderer`
  - `constructor(private readonly fontProvider: FontProvider, private readonly imageProvider?: ImageProvider)`
  - `async render(template: Template, data: unknown, mode: RenderMode): Promise<Uint8Array>`:
    1. **`typeof window !== 'undefined'`이면 즉시 예외** — 채택한 `subset-font`가 Node의
       `fs`·`Buffer`에 의존하므로 preview와 authoritative 모두 서버의 같은 렌더러를 사용한다.
       브라우저는 서버가 만든 preview PDF를 받아 표시한다.
    2. `const bindingResolver = new BindingResolver()`
    3. `const usedChars = new UsedCharCollector(data, bindingResolver).collect(template)`
    4. `template.fonts`(화이트리스트 폰트명 목록)의 각 굵기(400, 700)에 대해
       `this.fontProvider.load(fontName, weight)`로 원본 TTF를 받고
       `new FontSubsetter().subset(rawBytes, usedChars)`로 서브셋
    5. `pdf-lib`의 `PDFDocument.create()`, `registerFontkit(fontkit)`,
       `embedFont(subsetBytes, { subset: false })`로 폰트별 `PDFFont` 확보해 `Map`에 저장
       (**`subset: false`를 반드시 지정** — T40 결정 재확인)
    6. `template.page`로 페이지 크기 계산해 `pdf.addPage(...)`
    7. `template.getElements()`를 `z` 순서로 정렬 후 각각
       `element.accept(new PdfElementVisitor(page, pageHeightMm, fontMap, data, bindingResolver, new TextLayout()))`
    8. `mode === 'preview'`이면 페이지 대각선에 반투명 `'PREVIEW'` 텍스트를 추가로 그림
       (담당자가 미리보기와 발행본을 착각하지 않도록 하는 최소한의 안전장치)
    9. `return pdf.save()`
- 완료 조건:
  - 브라우저 환경에서 `preview`와 `authoritative`를 호출하면 각각 예외가 나는지 확인
  - `mode: 'preview'`로 렌더한 PDF에 워터마크 텍스트가 포함되는지 (pdf-lib로 다시 읽어
    텍스트 추출은 어려우므로, 간단히는 "예외 없이 끝나고 바이트 길이가 워터마크 없는
    버전보다 커졌는지"로 대체 확인 가능)
  - T23~T28로 만든 실제 임금명세서 템플릿 하나로 end-to-end 렌더 → PNG 변환 →
    `apps/poc/payslip.pdf.png`와 시각적으로 동등한지 확인

---
## Phase 9 — Designer: 캔버스 에디터 (presentation, browser)

여기서부터 React + Konva가 등장한다. `domain`/`application`을 직접 import해서 쓰되,
**UI 상태(선택, 도구, undo 스택)는 이 레이어에만 존재**한다. 도메인 객체(`Template`,
`Element`)는 여전히 불변이므로, 편집 중 상태는 "지금 편집 중인 Template 인스턴스"를
갱신하는 방식으로 다룬다.

### T44. `@report-tool/designer` 패키지 초기화
- 파일: `packages/designer/package.json`, `packages/designer/tsconfig.json`
- 선행: T02
- 목표: React·Konva 의존성을 가진 첫 브라우저 패키지를 성립시킨다.
- 구현:
  - `npm i react react-dom konva react-konva`
  - `package.json`에 `"@report-tool/core": "*"` 의존성 추가
  - `tsconfig.json`에 `"jsx": "react-jsx"` 추가 (T01의 base 확장)
  - [ARCHITECTURE.md 7절](ARCHITECTURE.md#7-프레임워크-선택)의 듀얼 빌드는 Vite 설정이 필요한데,
    **이 작업(T44)에서는 아직 만들지 않는다** — 빌드 설정은 Phase 9가 전부 끝난 뒤 별도
    작업(T57)에서 다룬다. 지금은 개발용으로 `tsc --noEmit`만 통과하면 된다
- 완료 조건: `npx tsc -p packages/designer --noEmit` 통과.

### T45. KonvaElementVisitor — Element를 Konva 도형으로 변환
- 파일: `packages/designer/src/view/KonvaElementVisitor.ts`
- 선행: T16~T21, T44
- 목표: [ARCHITECTURE.md 6.3](ARCHITECTURE.md#63-캔버스-렌더러를-두지-않는-이유)에서 결정한 대로,
  이 Visitor는 **최종 인쇄 결과의 근거가 아니라 편집 가능한 화면 표현**을 만든다.
  실제 인쇄 모양은 "미리보기" 버튼으로 T43의 PDF 렌더러를 호출해서 확인한다.
- 구현:
  - `class KonvaElementVisitor implements ElementVisitor<Konva.Node>`
  - 생성자: `constructor(private readonly mmToPx: number, private readonly data: unknown, private readonly bindingResolver: BindingResolver)` —
    `mmToPx`는 화면 확대/축소 배율 (예: 96dpi 기준 `96 / 25.4 ≈ 3.78`에 zoom factor를 곱한 값)
  - `visitText(element)`: `new Konva.Text({ x: element.frame.x * this.mmToPx, y: ..., text: Content.resolve(element.content, this.data), fontSize: element.style.size * (this.mmToPx / 2.834645669291339) 근사치, ... })`
    (pt→px 변환은 mm 경유: `frame`은 mm, `style.size`는 pt이므로 각각 알맞은 배율을 곱한다.
    정확한 배율 상수는 구현 시 `Frame`의 `POINTS_PER_MM`과 화면 DPI를 조합해서 계산할 것)
  - `visitField(element)`: `this.bindingResolver.resolve(element.binding, this.data)` 결과를
    텍스트로 쓰는 `Konva.Text`. **추가로 테두리를 얇게 그려 "이 자리는 데이터 바인딩된
    자리"임을 시각적으로 표시** (에디터에서 필드와 일반 텍스트를 구분하는 유일한 단서)
  - `visitTable`: 헤더 행 + 샘플 2~3행을 `Konva.Group`으로 묶어 표시 (실제 행 수는
    발행 시점에 결정되므로 편집 중엔 예시일 뿐임을 흐린 텍스트 등으로 표시)
  - `visitImage`, `visitBox`, `visitLine`: 각각 `Konva.Image`(자리표시자), `Konva.Rect`, `Konva.Line`
  - `visitSignature`: 점선 `Konva.Rect` + `label` 텍스트
  - 모든 `visitX`가 반환하는 Konva 노드에 `node.setAttr('elementId', element.id)`를 반드시
    설정한다 — 클릭 판정(`SelectTool`)이 이 값으로 원본 `Element`를 역참조한다
- 완료 조건 (수동 확인): 임시 HTML 페이지에서 Konva Stage를 만들고, T23으로 만든 임금명세서
  템플릿의 각 요소를 이 Visitor로 그려 화면에 배치가 대략 맞게 나오는지 눈으로 확인.

### T46. SelectionModel
- 파일: `packages/designer/src/controller/SelectionModel.ts`
- 선행: T44
- 목표: 지금 선택된 요소 id 집합을 관리. 다중 선택을 대비해 `Set`으로 시작한다
  (MVP는 단일 선택만 UI로 노출해도 되지만, 자료구조는 여러 개를 감당하게 만들어둔다).
- 구현:
  - `class SelectionModel`: `private selectedIds: Set<string> = new Set()`
  - `select(id: string, additive: boolean = false): void` — `additive`가 false면
    기존 선택을 지우고 `id` 하나만 선택
  - `clear(): void`
  - `isSelected(id: string): boolean`
  - `getSelectedIds(): readonly string[]`
- 완료 조건: `select('a')` → `getSelectedIds()` `['a']`. `select('b', true)` →
  `['a','b']`. `clear()` → `[]`.

### T47. SnapGuide
- 파일: `packages/designer/src/controller/SnapGuide.ts`
- 선행: T03
- 목표: 요소를 드래그할 때 다른 요소의 가장자리·중심에 가까워지면 자동으로 딱 맞춰준다.
  없으면 mm 단위 눈금에 손으로 맞추기가 매우 고통스럽다.
- 구현:
  - `class SnapGuide`: `constructor(private readonly thresholdMm: number = 2)`
  - `snap(moving: Frame, others: readonly Frame[]): Frame` — `others`의 각 `Frame`에 대해
    좌/우/중앙 x, 상/하/중앙 y 좌표들을 후보로 모으고, `moving`의 대응 좌표와의 차이가
    `thresholdMm` 이내인 후보가 있으면 그 값으로 치환한 새 `Frame` 반환. 여러 후보가
    있으면 가장 가까운 것 하나만 적용
- 완료 조건: 두 번째 요소가 `x: 20`에 있을 때, `moving`을 `x: 21`로 두고 `snap()` 호출 →
  `x`가 `20`으로 스냅됨. `x: 30`처럼 멀리 있으면 스냅 안 됨.

### T48. EditorCommand 추상 클래스 + CommandStack
- 파일: `packages/designer/src/command/EditorCommand.ts`, `packages/designer/src/command/CommandStack.ts`
- 선행: T23
- 목표: undo/redo. 캔버스 편집에서 상태를 통째로 diff하는 방식은 금방 한계에 부딪히므로
  "되돌릴 수 있는 작업 단위"를 명령 객체로 만든다.
- 구현:
  - `EditorCommand.ts`: `export abstract class EditorCommand { abstract execute(template: Template): Template; abstract undo(template: Template): Template; }`
    (도메인의 `Template`이 불변이므로, 명령은 "이전 템플릿을 받아 새 템플릿을 반환"하는
    순수 함수 형태를 띤다 — 이게 `execute`/`undo`를 대칭적으로 만들 수 있는 이유)
  - `CommandStack.ts`: `class CommandStack`:
    - `private undoStack: EditorCommand[] = []`, `private redoStack: EditorCommand[] = []`
    - `execute(command: EditorCommand, template: Template): Template` —
      `const next = command.execute(template)`, `undoStack.push(command)`,
      `redoStack = []` (새 명령이 실행되면 redo 이력은 버려진다 — 표준 undo/redo 동작), `return next`
    - `undo(template: Template): Template | null` — `undoStack`이 비었으면 `null`.
      아니면 `pop()`한 명령의 `undo(template)` 호출, `redoStack.push(그 명령)`, 결과 반환
    - `redo(template: Template): Template | null` — 대칭적으로 구현
    - `canUndo(): boolean`, `canRedo(): boolean`
- 완료 조건: 가짜 `EditorCommand`(템플릿에 이름 문자열만 붙이는 더미)로
  `execute` → `undo` → 원본과 동일한 템플릿으로 돌아오는지, `undo` → `redo` →
  다시 execute 결과와 동일한지 확인.

### T49. AddElementCommand, RemoveElementCommand
- 파일: `packages/designer/src/command/AddElementCommand.ts`, `.../RemoveElementCommand.ts`
- 선행: T48, T23
- 목표: 요소 추가/삭제를 되돌릴 수 있는 명령으로 만든다.
- 구현:
  - `AddElementCommand`: `constructor(private readonly element: Element)`.
    `execute(template)` → `template.addElement(this.element)`.
    `undo(template)` → `template.removeElement(this.element.id)`
  - `RemoveElementCommand`: `constructor(private readonly elementId: string)`.
    **`execute` 시점에 나중에 `undo`할 때 필요한 원본 요소를 어딘가에 저장해둬야 한다** —
    `execute(template)` 안에서 `this.removed = template.getElements().find(e => e.id === this.elementId)`로
    캡처한 뒤 `template.removeElement(this.elementId)` 반환. `undo(template)` →
    `this.removed`가 없으면 예외(=execute가 먼저 호출되지 않음), 있으면 `template.addElement(this.removed)`
- 완료 조건: 각각 `execute` 후 `undo` 했을 때 요소 목록이 원본과 동일(id 기준)한지 확인.

### T50. TransformElementCommand
- 파일: `packages/designer/src/command/TransformElementCommand.ts`
- 선행: T48, T23, T14(`Element.withFrame`)
- 목표: 요소 이동과 크기 변경을 하나의 명령으로 통합 (둘 다 "frame을 바꾼다"는 점에서
  로직이 동일하므로 별도 클래스로 나눌 이유가 없다는 판단 — [ARCHITECTURE.md 파일트리](ARCHITECTURE.md#3-파일-트리) 참조).
- 구현:
  - `constructor(private readonly elementId: string, private readonly beforeFrame: Frame, private readonly afterFrame: Frame)`
  - `execute(template)` → `template.replaceElement(this.elementId, el => el.withFrame(this.afterFrame))`
  - `undo(template)` → `template.replaceElement(this.elementId, el => el.withFrame(this.beforeFrame))`
- 완료 조건: 이동 후 undo하면 원래 위치로, redo하면 다시 이동된 위치로 돌아오는지 확인.

### T51. BindFieldCommand
- 파일: `packages/designer/src/command/BindFieldCommand.ts`
- 선행: T48, T23, T17(`FieldElement`)
- 목표: 필드 팔레트에서 드롭다운으로 필드를 선택했을 때, 해당 `FieldElement`의
  `binding`을 바꾸는 명령.
- 구현:
  - `constructor(private readonly elementId: string, private readonly beforeBinding: Binding, private readonly afterBinding: Binding)`
  - `execute(template)` → `template.replaceElement(this.elementId, el => { if (!(el instanceof FieldElement)) throw new Error('FieldElement가 아닌 요소에는 바인딩을 걸 수 없다'); return new FieldElement(el.id, el.frame, el.z, el.locked, this.afterBinding, el.style); })`
  - `undo`는 `afterBinding` 대신 `beforeBinding`으로 대칭 구현
- 완료 조건: 바인딩 변경 후 undo하면 원래 경로로 돌아오는지, `TextElement`에 시도하면
  예외가 나는지 확인.

### T52. EditorTool 추상 클래스 + SelectTool
- 파일: `packages/designer/src/tool/EditorTool.ts`, `packages/designer/src/tool/SelectTool.ts`
- 선행: T46, T50
- 목표: 캔버스 위 마우스 동작(클릭, 드래그)을 "지금 선택된 도구가 무엇이냐"에 따라
  다르게 해석한다. 도구 전환 UI(연필/텍스트/표 아이콘 등)의 배후 로직.
- 구현:
  - `EditorTool.ts`: `export abstract class EditorTool { abstract onPointerDown(xMm: number, yMm: number, controller: EditorController): void; abstract onPointerMove(xMm: number, yMm: number, controller: EditorController): void; abstract onPointerUp(xMm: number, yMm: number, controller: EditorController): void; }`
    (`EditorController`는 T54에서 만들 것을 미리 참조 — TypeScript는 순환 참조 없이
    타입만 import 가능하니 문제 없음)
  - `SelectTool.ts`: `onPointerDown`에서 클릭 좌표에 해당하는 요소를 찾아
    `controller.getSelectionModel().select(id)` 호출. 드래그 중(`onPointerMove`)이면
    `SnapGuide.snap()`을 거쳐 `TransformElementCommand`를 준비, `onPointerUp`에서
    `controller.execute(command)`로 확정
- 완료 조건 (수동 확인): 아직 `EditorController`가 없어 완전한 실행은 T54 이후 가능.
  지금은 컴파일 통과와, 순수 로직 부분(좌표→요소 찾기)만 가짜 데이터로 단위 테스트.

### T53. TextTool, FieldTool, ShapeTool, TableTool
- 파일: `packages/designer/src/tool/TextTool.ts`, `.../FieldTool.ts`, `.../ShapeTool.ts`, `.../TableTool.ts`
- 선행: T52, T49
- 목표: 캔버스를 드래그해 새 요소를 만드는 도구들. 넷 다 "드래그로 Frame을 정의 →
  기본값으로 요소 생성 → AddElementCommand 실행"이라는 같은 패턴을 따른다.
- 구현: 각 Tool은 `onPointerDown`에서 시작점을 기록, `onPointerMove`에서 임시 사각형을
  화면에만 표시(아직 명령 실행 안 함), `onPointerUp`에서 최종 `Frame`으로 요소를 생성해
  `AddElementCommand`를 `controller.execute()`. 요소별 기본값:
  - `TextTool`: `new TextElement(crypto.randomUUID(), frame, 0, false, {kind:'literal', value:'텍스트'}, new TextStyle('Pretendard', 10))`
  - `FieldTool`: 필드 팔레트에서 이미 어떤 필드를 고른 상태로 캔버스를 드래그하는 흐름이므로,
    생성자에 `constructor(private readonly chosenPath: string, private readonly chosenFormatSpec: FormatSpec | null)`를
    받아 `new FieldElement(..., new Binding(chosenPath, {formatSpec: chosenFormatSpec}), ...)`
  - `ShapeTool`: `constructor(private readonly shape: 'box'|'line')`으로 박스/선 중 선택
  - `TableTool`: 기본 컬럼 2개(`항목`, `금액`)짜리 `TableElement`를 생성. 실제 컬럼 구성은
    이후 속성 패널(T56 확장 또는 별도 UI, MVP는 최소한으로 — 컬럼 추가는 버튼 클릭으로
    `columns` 배열에 항목을 추가하는 별도의 작은 명령을 T51처럼 만들어도 되지만,
    **MVP 범위에서는 이 부분은 생략하고 기본 2컬럼 고정으로 시작해도 된다**고 명시
- 완료 조건: 각 도구로 드래그 후 `controller.getTemplate()`에 해당 종류 요소가
  하나 늘어나 있는지 확인 (T54 완료 후 통합 테스트로).

### T54. EditorController
- 파일: `packages/designer/src/controller/EditorController.ts`
- 선행: T48, T46, T52
- 목표: "지금 편집 중인 템플릿, 선택 상태, undo 스택, 현재 도구"를 한 곳에서 관리하는
  중심 클래스. React 컴포넌트들은 이 클래스의 상태를 구독해 화면을 그린다.
- 구현:
  - `class EditorController`:
    - `private template: Template`, `private readonly selectionModel = new SelectionModel()`,
      `private readonly commandStack = new CommandStack()`, `private currentTool: EditorTool`,
      `private listeners: Array<() => void> = []`
    - `constructor(initialTemplate: Template)`
    - `getTemplate(): Template`, `getSelectionModel(): SelectionModel`
    - `setTool(tool: EditorTool): void`
    - `execute(command: EditorCommand): void` — `this.template = this.commandStack.execute(command, this.template)`,
      `this.notifyChange()`
    - `undo(): void`, `redo(): void` — 각각 `commandStack.undo/redo` 호출, 성공하면
      `this.template` 갱신 + `notifyChange()`
    - `subscribe(listener: () => void): () => void` — 리스너 등록, 해제 함수 반환
      (React의 `useSyncExternalStore`나 단순 `useEffect`+`useState`로 이 클래스를 구독할 때 씀)
    - `private notifyChange(): void` — 등록된 모든 리스너 호출
- 완료 조건: `execute(AddElementCommand)` 호출 → `getTemplate()`에 요소 추가됨 +
  등록한 리스너가 호출됨. `undo()` → 요소가 사라짐 + 리스너 다시 호출됨.

### T55. CanvasStage
- 파일: `packages/designer/src/view/CanvasStage.ts`
- 선행: T45, T54
- 목표: Konva의 `Stage`/`Layer` 설정, mm↔px 배율 계산, 마우스 이벤트를 mm 좌표로 바꿔서
  `EditorController`/현재 `EditorTool`에 전달하는 것까지 — **Konva를 직접 다루는 코드는
  이 파일에만 있어야 한다** (다른 파일에서 `new Konva.XXX`를 보면 이 원칙이 깨진 것).
- 구현:
  - `class CanvasStage`: `constructor(container: HTMLDivElement, private readonly controller: EditorController, private readonly zoom: number = 1)`
  - 생성자에서 `new Konva.Stage({container, width, height})`와 `Layer` 생성, 페이지 배경
    사각형을 그림
  - `render(): void` — `controller.getTemplate().getElements()`를 전부 지우고
    `KonvaElementVisitor`로 다시 그림 (MVP는 매번 전체를 다시 그리는 단순한 방식으로
    시작 — 부분 갱신 최적화는 성능 문제가 실제로 확인되면 나중에 한다)
  - Stage의 `pointerdown`/`pointermove`/`pointerup` 이벤트에서 px 좌표를 `/ (this.zoom * PX_PER_MM)`로
    mm 좌표로 바꿔 `controller`의 현재 도구에 전달
  - `controller.subscribe(() => this.render())`로 상태 변경 시 자동 재렌더 연결
- 완료 조건 (수동 확인): 브라우저에서 실제로 요소를 클릭·드래그했을 때 화면이
  올바르게 갱신되는지 확인. 이 작업부터는 단위 테스트보다 실제 브라우저 확인이 더 빠르다.

### T56. FieldPalette (React)
- 파일: `packages/designer/src/view/FieldPalette.tsx`
- 선행: T23(`TemplateVariable`), T51
- 목표: 담당자가 "이 필드를 캔버스에 놓겠다"를 선택하는 드롭다운/목록 UI. **문자열을
  직접 타이핑하게 하지 않는다** — 오타로 조용히 빈 값이 나가는 것을 막기 위해서다.
- 구현:
  - `function FieldPalette(props: {entries: readonly PaletteEntry[]; onInsert: (entry: PaletteEntry) => void})`
  - `fields`를 순회해 목록으로 렌더. `type: 'array'`인 항목은 `children`을 들여쓰기해서 보여줌
    (표 컬럼 고를 때 참고용 — MVP에서 실제로 표 컬럼을 여기서 바로 연결하지 않아도 됨,
    T53에서 기본 컬럼으로 시작하는 것으로 충분)
  - 항목 클릭 시 `onPick(path, spec)` 호출 → 선택된 필드가 없으면 내용 영역의 빈 자리에
    기본 크기 `FieldElement`를 즉시 추가한다. 이미 캔버스에 있는 `FieldElement`가 선택된
    상태라면 새 요소를 추가하지 않고 `BindFieldCommand`를 실행한다.
  - 새 필드 카드를 흰 문서로 직접 드래그하면 드롭한 mm 좌표에 추가한다. 문서 가장자리에서
    놓더라도 내용 영역을 벗어나지 않게 보정한다.
  - `sensitive: true`인 필드는 옆에 "🔒" 표시 + 클릭 시 기본 `formatSpec`으로
    `{kind: 'mask', keepHead: 6, keepTail: 1}`을 자동 제안 (T12 `MaskFormatter`와 연결)
  - **MVP 디자인 보강**: 필드 라벨·전체 경로·타입으로 검색할 수 있는 검색창을 제공하고,
    각 필드는 라벨·경로·타입 배지·명시적인 추가 버튼을 가진 카드형 항목으로 표시한다.
    배열 필드는 그룹으로 묶어 자식 필드의 문맥을 유지하고, 검색 결과에서도 부모 그룹을 남긴다.
  - 필드 카드를 드래그하는 동안 문서에 드롭 안내와 강조선을 표시한다. 이미 놓인
    `FieldElement`가 선택된 상태라면 같은 목록을 "연결 변경" 모드로 보여 추가와 재바인딩을
    혼동하지 않게 하고, "새 필드 추가" 버튼으로 선택을 해제해 추가 모드로 돌아갈 수 있게 한다.
- 완료 조건 (수동 확인): 템플릿이 선언한 변수로 목록이 올바르게 그려지고, 클릭 시
  `onPick`이 올바른 인자로 호출되는지 브라우저 콘솔로 확인. 검색어에 맞는 중첩 필드만
  표시되는지, 클릭 즉시 추가·직접 드롭·민감 필드·연결 변경 안내가 구분되는지도 확인.

### T57. Designer 파사드 + 빌드 설정
- 파일: `packages/designer/src/Designer.ts`, `packages/designer/src/view/DesignerShell.tsx`,
  `packages/designer/src/view/DesignerStyles.ts`, `packages/designer/vite.config.ts`,
  `packages/designer/vite.config.standalone.ts`
- 선행: T54, T55, T56
- 목표: 호스트가 이 라이브러리를 쓸 때 보게 되는 **유일한 공개 진입점**. 지금까지 만든
  모든 내부 클래스는 이 파사드 뒤에 숨는다.
- 구현:
  - `interface DesignerOptions { container: HTMLElement; template: Template; sampleData?: unknown; onChange?: (template: Template) => void; }`
  - `class Designer`:
    - `constructor(options: DesignerOptions)` — 내부에서 `EditorController`, `CanvasStage`를
      생성하고 React로 `FieldPalette` 등 UI를 `options.container`에 마운트(`createRoot`)
    - `controller.subscribe(() => options.onChange?.(controller.getTemplate()))`로 변경 통지
    - `getTemplate(): Template` — 지금 편집 중인 템플릿을 즉시 꺼낼 때
    - `destroy(): void` — React 루트 `unmount()`, Konva `stage.destroy()`, 이벤트 리스너 정리
      (이게 없으면 호스트 앱에서 라우팅으로 화면을 벗어날 때 메모리가 샌다)
  - [ARCHITECTURE.md 7절](ARCHITECTURE.md#7-프레임워크-선택)의 듀얼 빌드:
    `vite.config.ts`(esm, React를 `external`), `vite.config.standalone.ts`(umd, React 포함)
    두 설정 파일을 만들고 `package.json`의 `build` 스크립트에서 둘 다 실행
  - **MVP 디자인 보강**: 화면 구조는 `DesignerShell.tsx`, Shadow DOM 전용 스타일은
    `DesignerStyles.ts`로 분리한다. 흰 문서가 중립색 작업 공간 위에 떠 있는 편집기 구조,
    현재 도구가 강조되는 상단 툴바, 우측 데이터 필드 사이드바, 문서·선택 상태를 보여주는
    하단 상태바를 기본 디자인으로 사용한다. hover·focus·disabled 상태를 빠뜨리지 않는다.
    필드 카드를 드래그하는 동안 흰 문서를 드롭 대상으로 강조하고, 드롭하면 화면 좌표를 mm로
    변환해 같은 추가 Command 흐름으로 전달한다.
- 완료 조건: `apps/admin`(Phase 13에서 만듦)에서 `new Designer({...})`로 실제로 마운트해서
  캔버스가 뜨고, 요소를 추가·이동·삭제·undo·필드 바인딩까지 전부 손으로 해봤을 때
  문제없이 동작하는지 확인. 활성 도구, 필드 검색·추가 안내, 선택 수와 요소 수가 실제 상태와
  일치하는지도 확인한다. 필드 카드 클릭 시 요소 수가 즉시 늘고, 직접 드롭한 위치에도 필드가
  생기며, 기존 필드를 선택한 뒤 클릭하면 요소 수 대신 바인딩만 바뀌는지도 확인한다.
  **Phase 9의 진짜 완료 조건은 이 수동 시나리오다.**

#### T57 Figma식 MVP 편집 경험 보강

Figma의 외형을 복제하는 것이 아니라 다음 사용 원칙을 가져온다.

- 캔버스에 보이는 내용은 가능한 한 캔버스에서 직접 편집한다.
- 선택 대상에 따라 우측 Inspector가 즉시 바뀌며 현재 변경 범위를 명확히 보여준다.
- 숨겨진 템플릿 문법 대신 필드 이름과 시각적 Token을 사용한다.
- 모든 템플릿 변경은 Command를 거쳐 Undo/Redo할 수 있어야 한다.
- hover·선택선·핸들·드롭 강조·빈 상태·오류 상태로 가능한 행동을 먼저 보여준다.
- 입력 중인 텍스트와 편집기 단축키의 포커스 범위를 구분한다.

기본 화면은 `왼쪽 Layers/Data 패널 → 가운데 Canvas → 오른쪽 Inspector` 구조를 사용한다.
아무것도 선택하지 않으면 페이지 속성, 표를 선택하면 표 속성, 셀을 선택하면 셀·열 속성을
Inspector에 표시한다. 디자인 모드와 데이터 미리보기 모드는 같은 위치의 토글로 전환한다.

##### P0 — 표 편집기: 다른 편집 기능보다 먼저 완료

표는 급여명세서·계약서 데이터 표현의 중심이므로 아래 T57-C~I를 모두 통과하기 전에는
Phase 9 표 기능을 완료로 표시하지 않는다.

- [x] **T57-A 키보드 편집**: 편집기 포커스 안에서 `Cmd/Ctrl+Z`,
  `Cmd/Ctrl+Shift+Z`, `Ctrl+Y`, `Delete/Backspace`, `Escape`, 방향키 1mm 이동,
  `Shift+방향키` 10mm 이동을 지원한다. 입력창과 호스트 페이지의 키 입력은 가로채지 않는다.
- [x] **T57-B 표 Source 도메인**: `StaticTableSource`와 `BoundTableSource`가 같은
  `TableElement`에서 행 공급 Strategy로 동작하고, 기존 binding JSON을 데이터 표로 복원한다.
- [x] **T57-C 표 편집 Command**
  - 정적 셀 값, 헤더, 행, 열, 열 너비, 행 높이, 헤더 표시 여부를 불변 방식으로 변경한다.
  - 행·열 추가/삭제, 정적↔데이터 Source 전환, 열 Token 연결을 각각 의미가 드러나는
    Command로 기록한다.
  - 한 번의 사용자 행동은 한 번의 Undo로 복원하고 새 명령 실행 뒤 redo 이력을 비운다.
  - 완료 조건: 각 명령 execute→undo→redo 대칭 테스트와 잘못된 표/행/열 대상 예외 테스트.
- [x] **T57-D 정적 표 직접 편집**
  - 표 도구로 기본 `항목/금액` 2열과 빈 데이터 행 3개를 만들고 새 표를 즉시 선택한다.
  - 셀 또는 헤더를 더블클릭하면 캔버스 위치에 HTML 입력기를 겹쳐 바로 편집한다.
  - `Enter` 확정, `Escape` 취소, `Tab/Shift+Tab` 다음·이전 셀, IME 한글 조합을 지원한다.
  - 숫자만 입력한 셀은 숫자로 저장한다 (금액 열의 정렬·포맷이 문자열에서는 동작하지 않는다).
  - 데이터 표의 본문은 값이 데이터에서 오므로 편집 대상이 아니고, 헤더는 두 표 모두 편집한다.
  - 완료: 브라우저에서 표 생성 → 셀 더블클릭 → 한글 입력 → `Tab` 확정·이동 → 숫자 입력 →
    `Enter` 확정까지 수행하고 저장 JSON에 `{ item: "국민연금", amount: 189000 }`이
    남는 것을 확인했다. 셀 입력 하나가 Undo 한 단위다.
- [ ] **T57-E 행·열 구조 편집**
  - 표 가장자리 hover 시 행/열 추가 `+` affordance를 보여주고 우측 Inspector에도 같은 버튼을 둔다.
  - 선택 행·열 추가, 복제, 삭제와 전체 행·열 개수 입력을 제공한다.
  - 열 경계 드래그로 너비, 행 설정으로 높이를 바꾸며 전체 폭과 최소 셀 크기를 지킨다.
  - 헤더 표시 토글, 열 순서 변경, 정렬(left/center/right)을 제공한다.
  - 완료 조건: 2×3 표를 3×4로 바꾸고 열 너비·순서를 변경한 뒤 Undo로 단계별 복원된다.
- [ ] **T57-F 표 Inspector**
  - 공통: X/Y/너비/높이, 표 유형, 행·열 수, 헤더 표시, 행 높이, 테두리·배경을 제공한다.
  - 표 선택: 정적/데이터 Source와 전체 구조 속성을 표시한다.
  - 셀 선택: 셀 값, 선택 열의 헤더·너비·정렬·포맷을 표시한다.
  - 입력값은 blur에 의존하지 않고 Enter 또는 명시적 확정 시 Command 하나로 반영한다.
  - 여러 입력에서 오류가 나면 필드 가까이에 원인을 표시하고 기존 템플릿을 변경하지 않는다.
- [x] **T57-G 데이터 표와 Token 드롭**
  - 왼쪽 Data 패널에서 배열 필드를 캔버스 빈 곳에 드롭하면 데이터 표를 생성한다.
  - 배열을 정적 표에 드롭하면 데이터 표로 바꾸고, 사라지는 입력 행 수를 상태바에 알린다.
    막지 않는 이유는 전환 전체가 Undo 한 번으로 복원되기 때문이다.
  - 배열 자식 필드를 본문 열에 놓으면 해당 열에 연결한다. 다른 배열 소속이거나 정적 표면
    열을 건드리지 않고 단일 필드를 만든다.
  - 선언 변수의 `label`을 헤더 기본값으로 제안하고, 숫자·금액·날짜 타입은 정렬과 포맷까지 제안한다.
  - 설계 모드에서는 열 값을 `⟨key⟩` Token으로, 미리보기 모드에서는 실제 샘플 값으로 보여준다.
  - 남긴 것: 정적 표로 되돌리는 반대 전환에서 미리보기 행을 복사하는 선택지,
    Inspector의 열 Drop Zone.
- [ ] **T57-H 디자인/데이터 미리보기**
  - 디자인 모드는 헤더와 Token chip을, 미리보기 모드는 최대 세 개의 실제 샘플 행을 표시한다.
  - `DesignerOptions.sampleData?: unknown`으로 호스트가 샘플 데이터를 주입하며 라이브러리는
    데이터를 직접 읽거나 저장하지 않는다.
  - 빈 배열, 누락 필드, 잘못된 타입을 빈 화면으로 숨기지 않고 표 가까이에 상태를 표시한다.
  - 미리보기 값과 실제 PDF Renderer가 같은 `TableSource.resolveRows()` 결과를 사용한다.
- [ ] **T57-I 표 저장·PDF·브라우저 통합 완료 조건**
  - 정적/데이터 표 JSON 왕복, 기존 binding JSON 마이그레이션, PDF 렌더 결과를 모두 검증한다.
  - 정적 표의 저장 셀과 데이터 표의 샘플 데이터가 서로 섞이거나 발행 데이터로 동결되지 않는지 확인한다.
  - 실제 브라우저에서 아래 사용자 시나리오를 처음부터 끝까지 수행하고 결과를 기록한다.

```text
정적 표 생성 → 셀/헤더 입력 → 행·열 추가 → 너비 변경 → Undo/Redo
  → 데이터 표 전환 → 배열 Source 선택 → 자식 Token 열 드롭
  → 디자인/미리보기 전환 → 저장 JSON 재로드 → PDF 렌더 확인
```

##### P1 — 표 완료 후 일반 Figma식 편집 경험

- [x] **T57-J 텍스트 직접 편집**: 더블클릭으로 캔버스 위 입력기(IME)를 띄우고 Enter 확정 /
  Escape 취소. Inspector에서 내용·종류·글꼴·크기·굵기·색상·정렬·넘침 정책을 Command로 변경한다.
- [x] **T57-K 선택·Transform**: 8개 리사이즈 핸들, Inspector의 mm 입력, 페이지 여백 표시,
  스냅과 실제 정렬 안내선(다른 요소·페이지 경계·여백·중심선)을 제공한다.
- [x] **T57-L 복제·다중 선택**: `Cmd/Ctrl+C/V/D`, Shift 선택, 드래그 영역 선택과 선택 집합의
  이동·삭제·정렬을 `CompositeCommand`로 한 번의 Undo 단위로 처리한다.
- [x] **T57-M Layers 패널**: 요소 이름(내용에서 도출)·종류·순서를 표시하고 선택, 잠금, 숨김,
  앞/뒤 순서 변경을 제공한다. 캔버스 선택과 양방향으로 동기화한다.
- [x] **T57-N 캔버스 탐색**: 확대·축소(⌘±, ⌘+휠), 화면 맞춤(⌘1), 100% 복귀(⌘0),
  Space+드래그 화면 이동과 현재 확대율 표시를 제공한다.
- [x] **T57-O 발견 가능성·접근성**: 버튼 tooltip에 단축키, 현재 도구/선택/모드 표시,
  요소별 경고 배지, 비활성 사유, 빈 상태의 다음 행동을 제공한다.
- [x] **T57-P 요소 7종 전부 생성**: 이미지·서명 도구를 추가해 도메인이 표현하는 모든 요소를
  편집기에서 만들 수 있게 한다. 클릭만 해도 기본 크기로 생성된다.
- [x] **T57-Q 페이지 설정 편집**: 선택이 없을 때 Inspector가 용지·방향·여백을 편집하고
  `ChangePageCommand`로 Undo 가능하게 만든다.
- [x] **T57-R 정렬·분배**: 다중 선택 정렬 6종과 균등 분배 2종. 단일 선택은 페이지 배치
  영역, 다중 선택은 선택 경계를 기준으로 삼는다.
- [x] **T57-S 검증 표시**: `TemplateValidator` 오류와 편집 경고(페이지 이탈, 이미지 출처
  없음, 서명자 없음, 빈 정적 표)를 캔버스·Layers·Inspector·상태바에 표시한다.
- [x] **T57-T 설계/미리보기 전환**: `DesignerOptions.sampleData`로 호스트가 샘플 데이터를
  주입하고, 설계 모드는 Token, 미리보기 모드는 실제 값을 보여준다. 라이브러리는 데이터를
  직접 읽거나 저장하지 않는다.

##### P2 — 남은 항목

- [x] **T57-X 템플릿 JSON 왕복**: `Template.toJSON()`, `PageSpec.toJSON()`,
  `TemplateFactory.fromJSON()`. 편집 결과를 호스트가 저장하고 다시 열 수 있는
  유일한 경로이며, 아래 완료 게이트의 "저장·복원" 조건이 이것 없이는 성립하지 않았다.
- [x] **T57-Y 사용자가 데이터 필드를 직접 정의**: 데이터 패널에서 데이터 필드와
  배열을 추가·삭제한다. 배열은 자식 구성을 정하면 문서에 놓는 순간 그 구성이 표의
  열이 된다. 정의되지 않은 경로를 참조하는 요소는 편집기가 경고로 표시한다.
  - 근거: 템플릿 변수는 "문서가
    필요한 값"이다. 선언을 막아도 승인된 필드가 특정 수령인 데이터에서 빠지는 것은
    막지 못하므로, 금지하는 대신 선언을 허용하고 검증으로 드러낸다.
  - 상수(정적 값)는 넣지 않는다. 고정 문구는 텍스트 요소와 정적 표 셀이 이미 저장하며,
    상수는 반복 입력을 줄이는 이점만 더하고 예약 이름공간·데이터 병합·렌더러 결합을
    늘린다. 반복 입력이 실제로 문제가 될 때 추가한다.
- [ ] **T57-U 열 formatSpec 적용**: `TableColumn.formatSpec`이 PDF와 캔버스 양쪽에서
  무시되고 있다. 두 경로가 공유하는 셀 값 계산 지점에 포맷을 적용해야 한다.
  (열을 만들 때 포맷을 제안하는 부분은 T57-G에서 이미 저장되고 있으므로,
  남은 일은 그 값을 실제로 적용하는 것뿐이다.)
- [ ] **T57-V PDF 미리보기 버튼**: 서버의 `preview` 렌더 결과를 pdf.js로 표시하는 경로
  (6.2 결정에 따라 캔버스는 근사치일 뿐이다).
- [ ] **T57-W 다중 페이지**: `Template`이 `PageSpec` 하나만 갖고 요소에 페이지 인덱스가
  없다. 급여명세서는 되지만 계약서는 안 된다. 저장 스키마 변경이므로 `schemaVersion` 2와
  마이그레이션이 필요하다.

##### Phase 9 UX 완료 게이트

- 표 P0 시나리오를 사용자 설명 없이 처음부터 완료할 수 있어야 한다.
- 모든 템플릿 변경은 Undo/Redo되고 입력창의 native Undo와 충돌하지 않아야 한다.
- Canvas, Inspector, Layers의 선택과 값이 항상 동일해야 한다.
- `getTemplate()`과 `onChange` 결과만으로 저장·복원이 가능해야 한다.
  (`toJSON()` → `TemplateFactory.fromJSON()`으로 충족. 7종 요소와 정적·데이터 표
  전체를 왕복시키는 테스트가 이 조건을 지킨다.)
- 브라우저 수동 검증, 전체 테스트, 세 패키지 TypeScript 검사와 Designer 빌드가 모두 통과해야 한다.
- 위 조건 전에는 Phase 10으로 이동하거나 Phase 9 구현 완료로 표시하지 않는다.

---
## Phase 10 — Viewer: 문서 열람 + 서명 (presentation, browser)

### T58. `@report-tool/viewer` 패키지 초기화
- 파일: `packages/viewer/package.json`, `packages/viewer/tsconfig.json`
- 선행: T02
- 목표: pdf.js 기반 뷰어 패키지를 성립시킨다.
- 구현: `npm i pdfjs-dist react react-dom perfect-freehand`, T44와 동일한 패턴의 설정
- 완료 조건: `npx tsc -p packages/viewer --noEmit` 통과.

### T59. PdfPageView
- 파일: `packages/viewer/src/view/PdfPageView.ts`
- 선행: T58
- 목표: 서버가 만든 발행 PDF를 브라우저에서 그대로 보여준다. **여기서는 절대 PDF를
  다시 만들지 않는다** — 받은 바이트를 그대로 그리기만 한다 (동결 원칙 재확인).
- 구현:
  - `class PdfPageView`: `constructor(private readonly canvas: HTMLCanvasElement)`
  - `async render(pdfBytes: Uint8Array, pageNumber: number = 1): Promise<void>` —
    `pdfjs.getDocument({data: pdfBytes}).promise`로 문서 로드, `getPage(pageNumber)`,
    `page.getViewport({scale})`로 캔버스 크기 설정 후 `page.render({canvasContext, viewport})`
- 완료 조건 (수동 확인): T43으로 만든 실제 발행 PDF 바이트를 넣었을 때 화면에 정확히
  나오는지, 서버에서 만든 PDF와 픽셀 단위로 동일하게 보이는지 확인.

### T60. SignaturePad
- 파일: `packages/viewer/src/signature/SignaturePad.ts`
- 선행: T58
- 목표: 손글씨 서명을 벡터 스트로크로 캡처한다. 래스터(단순 이미지)로만 저장하면
  확대 시 깨지므로 포인트 좌표를 남긴다.
- 구현:
  - `class SignaturePad`: `constructor(private readonly canvas: HTMLCanvasElement)`
  - 내부에 `private strokes: Array<Array<[number, number, number?]>> = []`
    (각 stroke는 포인트 배열, 포인트는 `[x, y, pressure?]`)
  - `pointerdown` 이벤트에서 새 stroke 시작, `pointermove`에서 포인트 추가 +
    `perfect-freehand`의 `getStroke()`로 매끄러운 외곽선 계산해 캔버스에 그림,
    `pointerup`에서 stroke 확정
  - `getStrokes(): ReadonlyArray<{points: ReadonlyArray<readonly [number, number, number?]>}>` —
    T27 `SignatureRecord`가 요구하는 형태로 변환해 반환
  - `toPng(): string` — `canvas.toDataURL('image/png')`의 base64 부분만 반환 (폴백용)
  - `clear(): void` — 캔버스와 `strokes` 초기화
- 완료 조건 (수동 확인): 마우스/터치로 그린 서명이 화면에 매끄럽게 나오고,
  `getStrokes()`가 그린 만큼의 포인트를 담고 있는지, `clear()` 후 빈 상태로 돌아오는지 확인.

### T61. StrokeSerializer
- 파일: `packages/viewer/src/signature/StrokeSerializer.ts`
- 선행: T60
- 목표: `SignaturePad`가 만든 stroke 배열을 서버로 보낼 JSON, 그리고 나중에 재렌더할 때
  쓸 형태로 변환한다 (양방향이 필요하므로 별도 클래스로 분리).
- 구현: `class StrokeSerializer`: `static toJSON(strokes): string` (`JSON.stringify` 래핑,
  형식 검증 포함), `static fromJSON(json: string): typeof strokes` (파싱 + 형식 검증,
  깨진 JSON이면 명확한 에러 메시지)
- 완료 조건: 왕복(round-trip) 테스트 — 임의의 stroke 배열을 `toJSON` → `fromJSON` 했을 때
  원본과 동일한지.

### T62. SigningApiClient
- 파일: `packages/viewer/src/infrastructure/SigningApiClient.ts`
- 선행: T58
- 목표: `viewer`가 report-tool **서버**(T63~T67에서 만들 우리 자신의 API)를 호출하는
  유일한 지점. 이것은 "호스트의 임의 시스템"이 아니라 **우리가 정의한 API 계약**을
  부르는 것이므로, 라이브러리가 I/O를 하지 않는다는 원칙에 어긋나지 않는다
  (원칙의 대상은 "호스트의 DB/스토리지"이지 "우리 서버의 공개 API"가 아니다).
- 구현:
  - `class SigningApiClient`: `constructor(private readonly baseUrl: string)`
  - `async fetchDocument(token: string): Promise<{pdfBytes: Uint8Array; requiredSigner: string}>` —
    `fetch(\`${baseUrl}/documents/view?token=${encodeURIComponent(token)}\`)`,
    실패 시(`!response.ok`) 상태 코드를 포함한 에러 throw
  - `async submitSignature(token: string, payload: {strokes: ...; imagePng: string}): Promise<void>` —
    `fetch(\`${baseUrl}/documents/sign\`, {method: 'POST', body: JSON.stringify({token, ...payload})})`
- 완료 조건: (T67 서버 완료 후) 실제 서버에 대해 두 메서드를 호출해 정상 응답을
  받는지 통합 확인. 지금 단계에서는 `fetch`를 스텁으로 바꿔 요청 URL·바디가
  올바른지만 확인해도 됨.

### T63. Viewer 파사드
- 파일: `packages/viewer/src/Viewer.ts`
- 선행: T59, T60, T61, T62
- 목표: 수신자가 링크를 열었을 때 뜨는 화면 전체를 캡슐화하는 공개 진입점.
- 구현:
  - `interface ViewerOptions { container: HTMLElement; token: string; apiBaseUrl: string; onSigned?: () => void; }`
  - `class Viewer`:
    - `constructor(options: ViewerOptions)` — `SigningApiClient`로 문서를 받아 `PdfPageView`로
      표시, 서명 UI(서명 버튼 → `SignaturePad` 모달)를 구성
    - 서명 완료 버튼 클릭 시: `StrokeSerializer`로 직렬화 → `SigningApiClient.submitSignature()` →
      성공하면 `options.onSigned?.()` 호출 + 화면에 "서명 완료" 표시로 전환
    - `destroy(): void`
- 완료 조건: T67(서버)까지 끝난 뒤, 실제 발행된 문서 링크로 열람→서명까지
  수동으로 한 번 끝까지 해보고 서버의 `IssuedDocument.status`가 `'signed'`로
  바뀌었는지 확인 (Phase 14 체크리스트와 겹치는 항목).

---

## Phase 11 — Server: HTTP 계층 (infrastructure + presentation, node)

표준 `Request → Response` 시그니처로 만든다 ([ARCHITECTURE.md 7절](ARCHITECTURE.md#7-프레임워크-선택)).
특정 서버 프레임워크에 의존하지 않는다.

### T64. `@report-tool/server` 패키지 초기화
- 파일: `packages/server/package.json`, `packages/server/tsconfig.json`
- 선행: T02
- 목표: Node 18+의 내장 `Request`/`Response`만으로 동작하는 패키지를 성립시킨다.
- 구현: `package.json`에 외부 HTTP 프레임워크 의존성을 넣지 않는다 (의도적으로 0개).
  `"engines": {"node": ">=18"}` 명시
- 완료 조건: `npx tsc -p packages/server --noEmit` 통과.

### T65. Router
- 파일: `packages/server/src/infrastructure/Router.ts`
- 선행: T64
- 목표: 경로+메서드를 컨트롤러 메서드에 매칭하는 최소한의 라우팅. Express 같은
  프레임워크를 쓰지 않기로 했으므로 이 정도는 직접 만든다 (아주 작아서 괜찮다).
- 구현:
  - `type Handler = (request: Request, params: Record<string, string>) => Promise<Response>`
  - `class Router`: `private routes: Array<{method: string; pattern: RegExp; paramNames: string[]; handler: Handler}> = []`
  - `add(method: string, path: string, handler: Handler): void` — `path`(예:
    `'/documents/:id/sign'`)를 정규식으로 변환, `:id` 같은 콜론 세그먼트를 `paramNames`로 추출
  - `async handle(request: Request): Promise<Response>` — URL과 메서드로 매칭되는 라우트를
    찾아 `handler` 호출. 못 찾으면 `new Response('Not Found', {status: 404})`
- 완료 조건: `/documents/:id/sign`에 등록한 핸들러가 `/documents/doc123/sign` 요청에서
  `params.id === 'doc123'`로 호출되는지 확인. 매칭 안 되는 경로는 404.

### T66. IssuanceController
- 파일: `packages/server/src/controller/IssuanceController.ts`
- 선행: T35(`IssuanceService`), T65
- 목표: `POST /documents/issue` 요청을 받아 `IssuanceService.issue()`를 호출하는 얇은 계층.
  **비즈니스 로직은 여기 없다** — 요청 파싱과 응답 조립만 한다.
- 구현:
  - `class IssuanceController`: `constructor(private readonly issuanceService: IssuanceService)`
  - `async handle(request: Request): Promise<Response>`:
    1. `const {templateId, recipientId, issuedBy} = await request.json()`
    2. 필수 필드 누락 시 `new Response(JSON.stringify({error: '...'}), {status: 400})`
    3. `const document = await this.issuanceService.issue(templateId, recipientId, issuedBy)`
    4. `new Response(JSON.stringify({id: document.id, status: document.status}), {status: 201, headers: {'Content-Type': 'application/json'}})`
    5. 서비스가 던진 예외는 여기서 잡아 `500`(또는 검증 실패류는 `422`)으로 변환
- 완료 조건: 정상 요청 → 201 + 문서 id 응답. `templateId` 누락 → 400.
  draft 템플릿으로 발행 시도(서비스가 예외) → 422.

### T67. DistributionController, SigningController
- 파일: `packages/server/src/controller/DistributionController.ts`, `.../SigningController.ts`
- 선행: T36, T37, T65
- 목표: 링크 발급, 문서 열람, 서명 접수 각각의 얇은 HTTP 계층.
- 구현:
  - `DistributionController.handle(request, params)`: `POST /documents/:id/link` —
    `params.id`와 body의 `ttlSeconds`(옵션)로 `DistributionService.createLink()` 호출,
    `{token}` JSON 응답
  - `SigningController`에 두 메서드:
    - `handleView(request)`: `GET /documents/view?token=...` — URL 쿼리에서 token 추출,
      `SigningService.view()` 호출, PDF 바이트를 `Content-Type: application/pdf`로 응답
      (또는 JSON으로 `{pdfBase64, status}` — MVP는 뷰어 구현(T62)과 계약을 맞추는 쪽으로
      결정. **결정: JSON으로 응답하고 `pdfBase64` 필드에 base64 문자열을 담는다**,
      이유는 응답 하나로 상태 정보와 바이트를 동시에 줄 수 있어서 T62 구현이 단순해짐)
    - `handleSign(request)`: `POST /documents/sign` — body의 `{token, strokes, imagePng, authMethod}`로
      `SigningService.sign()` 호출, `{status: 'signed'}` 응답
- 완료 조건: 각 엔드포인트를 스텁 서비스로 호출해 올바른 상태 코드·바디가 나오는지 확인.
  토큰이 유효하지 않을 때(서비스가 예외) → 401.

### T68. createMiddleware
- 파일: `packages/server/src/infrastructure/createMiddleware.ts`
- 선행: T66, T67, T29~T32(모든 포트)
- 목표: 호스트가 어댑터 구현체들을 넣기만 하면 완성된 요청 핸들러를 받는
  **이 패키지의 유일한 공개 진입점**.
- 구현:
  - ```ts
    interface MiddlewareDeps {
      templateStore: TemplateStore; documentStore: DocumentStore; dataProvider: DataProvider;
      storage: StorageAdapter; fontProvider: FontProvider; authAdapter: AuthAdapter;
      renderer: DocumentRenderer; hashProvider: HashProvider;
    }
    export function createMiddleware(deps: MiddlewareDeps): (request: Request) => Promise<Response> {
      const issuanceService = new IssuanceService(deps.templateStore, deps.dataProvider, deps.renderer, deps.storage, deps.documentStore, deps.hashProvider);
      // ...나머지 서비스·컨트롤러 조립
      const router = new Router();
      router.add('POST', '/documents/issue', (req) => issuanceController.handle(req));
      // ...나머지 라우트 등록
      return (request) => router.handle(request);
    }
    ```
  - 이 함수 하나가 [PRODUCT.md 6절](PRODUCT.md#6-성공-기준)의 "호스트 개발자가 어댑터
    5개만 구현하면 붙는다"를 실제로 만족시키는지 검증하는 지점이다
- 완료 조건: 전부 스텁 어댑터로 `createMiddleware(stubs)`를 호출해 반환된 함수에
  가짜 `Request`를 넣었을 때 라우팅이 정확한 컨트롤러로 가는지 확인.
  (Next.js App Router에 `export const POST = handler`로 그대로 붙는지는 Phase 13에서 확인)

---

## Phase 12 — 참조 어댑터 (apps/admin, MVP 실행·시연용)

**이 구간은 프로덕션 코드가 아니다.** 실제 서비스에서는 호스트가 자기 DB·스토리지로
아래 인터페이스들을 다시 구현해야 한다. 여기서는 MVP를 실제로 돌려보기 위한
가장 단순한 구현만 만든다.

### T69. InMemoryTemplateStore, InMemoryDocumentStore
- 파일: `apps/admin/adapters/InMemoryTemplateStore.ts`, `.../InMemoryDocumentStore.ts`
- 선행: T29
- 목표: DB 없이 `TemplateStore`/`DocumentStore`를 즉시 실행 가능하게 만든다.
- 구현: 각각 `private readonly items = new Map<string, Template>()`(또는 `IssuedDocument`)에
  저장하는 가장 단순한 구현. `TemplateStore.listVersions`는 같은 `id`를 가진 여러 버전을
  배열로 보관하는 방식으로 (`Map<string, Template[]>`) 구현
- 완료 조건: `save` → `get`으로 동일 객체가 나오는지, `publish` 후 `get`한 템플릿의
  `status`가 `'published'`인지 확인.

### T70. FileSystemStorageAdapter
- 파일: `apps/admin/adapters/FileSystemStorageAdapter.ts`
- 선행: T31
- 목표: S3 대신 로컬 디스크에 PDF를 저장 (Node `fs/promises` 사용 — 이건 `infrastructure`
  코드이므로 Node API를 써도 된다, `domain`이 아니기 때문).
- 구현: `constructor(private readonly rootDir: string)`. `put`은
  `fs.writeFile(path.join(rootDir, key), bytes)`(중간 디렉토리는 `fs.mkdir(..., {recursive: true})`로
  먼저 생성), `get`은 `fs.readFile`.
- 완료 조건: `put` 후 `get`으로 동일 바이트가 나오는지 확인.

### T71. StaticJsonDataProvider
- 파일: `apps/admin/adapters/StaticJsonDataProvider.ts`
- 선행: T30
- 목표: 실제 DB 대신 고정된 JSON 파일(가짜 직원 명단)을 데이터 소스로 흉내낸다.
- 구현: 생성자에서 가짜 직원 데이터 배열(3~5명, 이름·사원번호·부서·급여항목 포함)을
  들고 있음. 데이터 키는 T42 PoC의 임금명세서 항목과 1:1로 맞춘다. `sample()`은 첫 번째
  가짜 직원인데 주민등록번호는 이미 마스킹된 채로 반환. `resolve(templateId, recipientId)`는
  `recipientId`로 배열에서 찾아 그대로 반환(마스킹 없이 — 실제 발행이므로)
- 완료 조건: `sample()`의 주민번호가 마스킹된 문자열인지,
  `resolve('tpl_payslip','emp1')`이 실제 값을 반환하는지 확인.

### T72. TokenAuthAdapter
- 파일: `apps/admin/adapters/TokenAuthAdapter.ts`
- 선행: T31
- 목표: 배포 링크용 토큰 발급·검증. MVP는 JWT 라이브러리 없이 단순하게 만든다.
- 구현: `npm i jsonwebtoken` (또는 Node 내장 `crypto.createHmac`로 직접 서명 — MVP는
  라이브러리 없이 `crypto.createHmac('sha256', secret).update(payload).digest('hex')`로
  서명한 토큰 `base64(payload).서명` 형태를 직접 만들어도 충분히 단순하다. 어느 쪽이든
  좋으나 **외부 의존성을 하나 줄이는 방향(HMAC 직접 구현)을 권장**한다).
  `issueToken`은 `{documentId, recipientId, exp: Date.now() + ttlSeconds*1000}`을 서명해
  반환. `verifyToken`은 서명 검증 + `exp` 만료 확인, 실패 시 예외.
- 완료 조건: 발급한 토큰을 즉시 검증하면 원래 `documentId`/`recipientId`가 나오는지,
  변조된 토큰(문자 하나 바꿈)은 검증 실패하는지, `ttlSeconds: -1`로 발급하면
  검증 시 만료 예외가 나는지 확인.

### T73. NodeCryptoHashProvider, NodeFontProvider
- 파일: `apps/admin/adapters/NodeCryptoHashProvider.ts`, `.../NodeFontProvider.ts`
- 선행: T32
- 목표: SHA-256 계산과 폰트 파일 공급의 가장 단순한 구현.
- 구현:
  - `NodeCryptoHashProvider`: `sha256(bytes)` → `crypto.createHash('sha256').update(bytes).digest('hex')`
  - `NodeFontProvider`: 생성자에서 폰트 디렉토리 경로를 받고, `load(family, weight)`는
    `${family}-${weightToName(weight)}.ttf` 규칙으로 파일을 읽어 반환
    (`node_modules/pretendard/dist/public/static/alternative/`를 그대로 활용 —
    T42 PoC에서 이미 어떤 파일이 정상 동작하는지 확인했다)
- 완료 조건: 알려진 바이트열의 SHA-256을 온라인 계산기 등으로 미리 구해 비교,
  `load('Pretendard', 700)`이 실제 Bold TTF 파일 바이트를 반환하는지 확인.

---
## Phase 13 — 데모 앱 연결 (apps/admin)

Next.js + React를 유일하게 직접 쓰는 곳. **`packages/*`의 공개 파사드/함수만 사용한다**
(`Designer`, `Viewer`, `createMiddleware`, 각 포트 인터페이스) — 내부 클래스를 직접
import하면 도그푸딩의 의미가 없어진다.

### T74. Next.js 프로젝트 초기 설정 + API 라우트 연결
- 파일: `apps/admin/` 전체, `apps/admin/app/api/documents/[...path]/route.ts`
- 선행: T68, T69~T73
- 목표: `createMiddleware`가 실제로 Next.js App Router에 "그대로" 붙는지 확인한다 —
  이게 안 되면 [ARCHITECTURE.md 7절](ARCHITECTURE.md#7-프레임워크-선택)의 핵심 주장이 거짓이 된다.
- 구현:
  - `npx create-next-app@latest apps/admin --typescript --app` (또는 수동 설정)
  - `apps/admin/adapters/index.ts`에서 T69~T73 어댑터들을 전부 생성해 하나의
    `MiddlewareDeps` 객체로 조립
  - `app/api/documents/[...path]/route.ts`:
    ```ts
    import { createMiddleware } from '@report-tool/server';
    import { deps } from '../../../../adapters';
    const handler = createMiddleware(deps);
    export const GET = handler;
    export const POST = handler;
    ```
- 완료 조건: `POST /api/documents/issue`에 curl로 요청을 보내 정상 응답이 오는지 확인.
  **`route.ts`가 3줄로 끝나는지가 검증 대상이다** — 더 길어지면 어딘가에서 원칙이 깨졌다는 뜻.

### T75. 템플릿 설계 페이지
- 파일: `apps/admin/app/design/page.tsx`
- 선행: T57, T74
- 목표: 실제로 브라우저에서 급여명세서 양식을 그려보는 화면.
- 구현: `useEffect`에서 `new Designer({ container: ref.current, template: 새 draft 템플릿, onChange: (t) => 상태에 저장 })`.
  "저장" 버튼 → `TemplateStore.save()`를 호출하는 API 라우트로 POST. "발행" 버튼 →
  `TemplateService.publish()`를 호출하는 API 라우트로 POST
- 완료 조건: T42 PoC와 동등한 임금명세서 양식을 **코드 없이 마우스로만** 만들 수 있는지 확인.

### T76. 발행 시뮬레이션 페이지
- 파일: `apps/admin/app/issue/page.tsx`
- 선행: T74
- 목표: 담당자가 발행 대상을 골라 문서를 만들고 링크를 받는 화면.
- 구현: 가짜 직원 목록(T71의 `StaticJsonDataProvider` 데이터) 드롭다운 → "발행" 버튼 →
  `POST /api/documents/issue` → 성공 시 "링크 생성" 버튼 → `POST /api/documents/:id/link` →
  받은 토큰으로 `/sign?token=...` URL을 화면에 표시(복사 가능하게)
- 완료 조건: 발행 → 링크 생성까지 클릭만으로 끝나는지 확인.

### T77. 열람·서명 페이지
- 파일: `apps/admin/app/sign/page.tsx`
- 선행: T63, T74
- 목표: T76에서 만든 링크를 열었을 때 뜨는 화면.
- 구현: URL의 `?token=` 쿼리를 읽어 `new Viewer({ container: ref.current, token, apiBaseUrl: '/api', onSigned: () => alert('서명 완료') })`
- 완료 조건: 링크를 열었을 때 PDF가 보이고, 서명 후 완료 표시가 나오는지 확인.

---

## Phase 14 — 통합 검증

### T78. End-to-End 수동 시나리오
- 선행: T01~T77 전부
- 목표: 이 프로젝트의 한 문단 정의([SUMMARY.md 1절](SUMMARY.md#1-무엇을-만드는가))가
  실제로 전부 동작하는지 한 번에 확인하는 최종 체크리스트.
- 절차 (전부 `apps/admin`에서, 코드를 열지 않고 마우스와 키보드만으로):
  1. `/design` 페이지에서 임금명세서 양식을 처음부터 만든다 (텍스트, 필드 5개 이상,
     지급/공제 반복 표 1개씩, 서명란 1개)
  2. "미리보기"로 실제 인쇄 모양을 확인한다 (워터마크가 보여야 한다)
  3. "발행"으로 템플릿을 동결한다
  4. `/issue` 페이지에서 가짜 직원 한 명을 골라 발행하고 링크를 받는다
  5. 그 링크를 **새 시크릿 창**에서 연다 (수신자 시점 재현) — PDF가 워터마크 없이
     정확히 보이는지 확인
  6. 화면에서 서명을 그리고 제출한다
  7. `/issue` 페이지(또는 별도 조회 화면)에서 해당 문서의 상태가 `'signed'`로
     바뀌었는지, 감사로그에 issue→view→sign 순서로 기록됐는지 확인
  8. **변조 시나리오**: 같은 문서를 다시 발행 대상 데이터만 바꿔서 재발행해보고
     (같은 템플릿, 다른 recipientId) 먼저 만든 문서의 PDF·해시가 그대로인지 확인
     (동결 원칙이 실제로 지켜지는지의 최종 증거)
- 완료 조건: 8단계가 전부 예외 없이, 코드 수정 없이 끝난다. 이게 통과하면 MVP다.
