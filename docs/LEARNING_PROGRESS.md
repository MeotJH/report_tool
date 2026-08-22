# 학습형 구현 진행 상태

이 문서는 새 세션에서도 구현 및 학습 흐름을 이어가기 위한 기록이다.

상태 의미:

- `미착수`: 아직 구현을 시작하지 않음
- `구현 중`: 일부 작업을 구현하고 있음
- `구현 완료`: 코드 작성과 해당 검증을 마침
- `학습 확인 중`: 구조 설명 이후 사용자 실습을 기다리고 있음
- `학습 확인 완료`: 사용자가 구조를 확인하고 작은 변경 실습까지 통과함
- `학습 생략`: 사용자가 명시적으로 실습을 생략하고 다음 단계 진행을 선택함

| Phase | 작업 | 구현 상태 | 학습 상태 | 마지막 확인 |
|---|---|---|---|---|
| 0 | T01~T02 프로젝트 기반 설정 | 구현 완료 | 학습 확인 완료 | 2026-08-22 |
| 1 | T03~T07 Domain 값 객체 | 구현 완료 | 학습 확인 완료 | 2026-08-22 |
| 2 | T08~T13 Domain 값 포맷터 | 구현 완료 | 학습 확인 완료 | 2026-08-22 |
| 3 | T14~T22 Domain 요소 | 구현 완료 | 학습 확인 완료 | 2026-08-22 |
| 4 | T23~T25 템플릿 엔티티 | 구현 완료 | 학습 확인 완료 | 2026-08-22 |
| 5 | T26~T28 발행 문서 엔티티 | 구현 완료 | 학습 생략 | 2026-08-22 |
| 6 | T29~T32 Application 포트 | 구현 완료 | 학습 생략 | 2026-08-22 |
| 7 | T33~T37 Application 서비스 | 구현 완료 | 학습 생략 | 2026-08-22 |
| 8 | T38~T43 PDF Renderer | 구현 완료 | 학습 확인 완료 | 2026-08-22 |
| 9 | T44~T57 Designer | 구현 중 | 학습 확인 중 | 2026-08-22 |
| 10 | T58~T63 Viewer | 미착수 | 미착수 | - |
| 11 | T64~T68 Server HTTP 계층 | 미착수 | 미착수 | - |
| 12 | T69~T73 참조 어댑터 | 미착수 | 미착수 | - |
| 13 | T74~T77 데모 앱 | 미착수 | 미착수 | - |
| 14 | T78 통합 검증 | 미착수 | 미착수 | - |

## 현재 학습 게이트

- 현재 구현 대상: Phase 9, T44 디자이너 패키지 초기화 및 학습 확인 완료
- 사용자 실습: 디자이너 공개 진입점에 패키지 식별 상수를 추가하고 타입 검사 통과
- 다음 작업 진행 가능 여부: T44 커밋 후 T45 진행 가능

## 작업 기록

- 2026-08-22: Phase 0 T01~T02 구현 완료.
  - 공통 TypeScript·Vitest 설정과 `@report-tool/core` workspace를 생성했다.
  - `npm test`: 테스트 파일 1개, 테스트 1개 통과.
  - `npx tsc -p packages/core`: 통과, `dist/index.js`와 `dist/index.d.ts` 생성 확인.
  - 사용자 실습: 루트 npm script에 `typecheck:core`를 올바르게 추가했다.
  - `npm run typecheck:core`: 사용자 실행 및 AI 재검증 통과.
- 2026-08-22: Phase 1 T03~T07 구현 완료.
  - `Frame`, `PageSpec`, `TextStyle`, `DataPath`, `Binding` 값 객체를 구현했다.
  - T07의 선행 타입 의존성을 해결하기 위해 T08의 `FormatSpec` 타입만 먼저 정의했다.
  - 실패 테스트 확인 후 구현했으며 `npm test`: 테스트 파일 5개, 테스트 18개 통과.
  - `npm run typecheck:core`: 통과.
  - 빌드된 `@report-tool/core` 공개 진입점 import와 domain 외부 런타임 의존성 부재를 확인했다.
  - 사용자 실습: `Frame.moveTo(x, y)`를 테스트 우선으로 추가하고 상대 이동과 절대 이동의 차이를 확인했다.
  - `npm test`: 테스트 파일 5개, 테스트 19개 통과.
  - `npm run typecheck:core`: 사용자 실습 반영 후 재검증 통과.
- 2026-08-22: Phase 2 T08~T13 구현 완료.
  - `ValueFormatter`와 통화·숫자·날짜·마스킹·일반 문자열 전략을 구현했다.
  - `FormatterRegistry`가 `FormatSpec`을 실행 가능한 전략으로 변환하도록 구현했다.
  - 13자리 마스킹 결과가 14자리로 기재된 `TASKS.md` 예시를 원본 길이에 맞게 수정했다.
  - 실패 테스트 확인 후 구현했으며 `npm test`: 테스트 파일 11개, 테스트 40개 통과.
  - `npm run typecheck:core`: 통과.
  - 빌드된 공개 API의 포맷 생성·실행과 domain 외부 런타임 의존성 부재를 확인했다.
  - 사용자 실습: `PercentFormatter`를 만들고 `FormatSpec`, `FormatterRegistry`, 공개 API에 연결했다.
  - AI가 사용자 요청에 따라 주석, 들여쓰기, 세미콜론 등 기계적인 마무리를 정리했다.
  - `npm test`: 테스트 파일 12개, 테스트 44개 통과.
  - `npm run typecheck:core`: 사용자 실습 반영 후 재검증 통과.
  - `@report-tool/core` 공개 import로 `0.153`이 `15.3%`로 변환되는 것을 확인했다.
- 2026-08-22: Phase 3 T14~T22 구현 완료.
  - `Element` 공통 계약과 7종 요소, `ElementVisitor`를 구현했다.
  - 고정·템플릿 문구를 코드 실행 없이 해석하는 `ContentResolver`를 구현했다.
  - `ElementFactory`로 7종 요소의 실제 JSON 문자열 왕복을 구현하고 검증했다.
  - `DataPath`, `Binding`, `TextStyle`에 안정적인 JSON 저장을 위한 표현을 추가했다.
  - 실패 테스트 확인 후 구현했으며 `npm test`: 테스트 파일 15개, 테스트 69개 통과.
  - `npm run typecheck:core`: 통과.
  - domain 외부 런타임 의존성 부재와 `@report-tool/core` 공개 API 왕복을 확인했다.
  - 사용자 실습: `ElementVisitor<number>`로 Text와 Box의 면적을 `accept()` 경유로 계산했다.
  - AI가 사용자 요청에 따라 실습 코드의 들여쓰기와 중복 표현을 정리했다.
  - `npm test`: 테스트 파일 15개, 테스트 71개 통과.
  - `npm run typecheck:core`: 사용자 실습 반영 후 재검증 통과.
- 2026-08-22: Phase 4 T23~T25 구현 완료.
  - 요소 목록과 발행 불변 규칙을 관리하는 `Template` 엔티티를 구현했다.
  - 빈 템플릿과 중복 요소 id를 수집하는 `TemplateValidator`를 구현했다.
  - 데이터 조회·누락 정책·포맷 적용을 결합하는 `BindingResolver`를 구현했다.
  - 실패 테스트 확인 후 구현했으며 `npm test`: 테스트 파일 18개, 테스트 85개 통과.
  - `npm run typecheck:core`: 통과.
  - domain 외부 런타임 의존성 부재와 `@report-tool/core` 공개 API 실행을 확인했다.
  - 사용자 실습: 초안 이름을 불변 방식으로 변경하는 `Template.rename(name)`을 추가했다.
  - AI가 사용자 요청에 따라 발행본 변경 차단 테스트와 JSDoc을 마무리했다.
  - `npm test`: 테스트 파일 18개, 테스트 87개 통과.
  - `npm run typecheck:core`: 사용자 실습 반영 후 재검증 통과.
- 2026-08-22: Phase 5 T26~T28 구현 완료.
  - SHA-256 문자열의 형식을 보장하고 값으로 비교하는 `DocumentHash`를 구현했다.
  - 서명 증거를 보관하는 `SignatureRecord`와 행위 이력을 표현하는 `AuditEntry`를 구현했다.
  - 발행·조회·서명·취소 상태 전이와 감사로그를 관리하는 `IssuedDocument`를 구현했다.
  - 서명 대상 해시와 발행 PDF 해시가 다르면 변조 의심 예외가 발생하도록 검증했다.
  - 실패 테스트를 먼저 확인한 후 `npm test`: 테스트 파일 21개, 테스트 103개 통과.
  - `npm run typecheck:core`: 통과.
  - `@report-tool/core` 공개 import로 같은 해시의 서명이 `signed` 상태로 전환되는 것을 확인했다.
  - 사용자 요청에 따라 작은 변경 실습은 생략하고 다음 Phase로 진행한다.
- 2026-08-22: Phase 6 T29~T32 구현 완료.
  - 템플릿과 발행 문서의 영속화를 분리하는 `TemplateStore`, `DocumentStore` 포트를 정의했다.
  - 호스트 데이터와 필드 구조를 공급하는 `DataProvider` 포트를 정의했다.
  - PDF 저장, 폰트 공급, 인증을 분리하는 `StorageAdapter`, `FontProvider`, `AuthAdapter`를 정의했다.
  - PDF 렌더링과 SHA-256 계산을 분리하는 `DocumentRenderer`, `HashProvider`를 정의했다.
  - 모든 포트를 `@report-tool/core`의 공개 타입으로 노출했다.
  - 이 Phase는 실행 구현이 없는 타입 계약이므로 새 런타임 테스트를 작성하지 않았다.
  - `npm run typecheck:core`: 통과, 생성된 `dist/index.d.ts`에서 공개 타입을 확인했다.
  - `npm test`: 기존 테스트 파일 21개, 테스트 103개 통과.
  - 사용자 요청에 따라 작은 변경 실습은 생략하고 다음 Phase로 진행한다.
- 2026-08-22: Phase 7 T33~T37 구현 완료.
  - 저장과 발행 전 검증을 조율하는 `TemplateService`를 구현했다.
  - 샘플 데이터와 preview 모드만 사용하는 `PreviewService`를 구현했다.
  - 실제 데이터 조회부터 권위 PDF 렌더, 해시, 파일·문서 저장까지 연결하는 `IssuanceService`를 구현했다.
  - 취소되지 않은 발행 문서에 수신자용 토큰을 발급하는 `DistributionService`를 구현했다.
  - 토큰 기반 조회와 서버 보관 해시 기반 서명을 처리하는 `SigningService`를 구현했다.
  - 실패 테스트를 먼저 확인한 뒤 `npm test`: 테스트 파일 26개, 테스트 114개 통과.
  - `npm run typecheck:core`: 통과, 생성된 `dist/index.d.ts`에서 서비스 공개 API를 확인했다.
  - domain에서 application을 역참조하는 import가 없음을 확인했다.
  - 사용자 요청에 따라 작은 변경 실습은 생략하고 다음 Phase로 진행한다.
- 2026-08-22: Phase 8 T38~T43 구현 완료.
  - `@report-tool/renderer` workspace와 PDF·fontkit·subset-font 의존성을 구성했다.
  - Element Visitor로 텍스트·필드·표·서명란의 실제 출력 문자를 모으는 `UsedCharCollector`를 구현했다.
  - harfbuzz 기반으로 TTF를 미리 서브셋하는 `FontSubsetter`를 구현했다.
  - wrap·shrink·truncate 전략으로 PDF 텍스트 영역을 계산하는 `PdfTextLayout`을 구현했다.
  - 실패 테스트를 먼저 확인한 뒤 `npm test`: 테스트 파일 29개, 테스트 121개 통과.
  - `npm run typecheck:core`, `npm run typecheck:renderer`: 통과.
  - 실제 Pretendard Regular TTF가 2661.9KB에서 15.2KB로 줄어드는 것을 확인했다.
  - 생성 PDF를 macOS Quick Look으로 PNG 변환해 한글·영문·숫자 글리프가 빠짐없이 표시됨을 확인했다.
  - `pdftoppm`은 설치되어 있지 않아 동일 목적의 Quick Look 렌더링으로 시각 검증했다.
  - `subset-font`가 Node `fs`·`Buffer`에 의존하므로 T43의 브라우저 직접 렌더 요구와 충돌할 수 있음을 발견했다.
    T42~T43 구현 전에 preview도 서버에서 수행할지, 브라우저용 서브셋 방식을 별도로 둘지 결정해야 한다.
  - 사용자 참고 이미지의 인적사항·지급·공제·계산 방법 구조를 `PayslipTestFixture`로 작성했다.
  - 실제 Pretendard TTF로 A4 한 페이지를 만드는 `PayslipRender.acceptance.test.ts`를 추가했다.
  - `PdfElementVisitor`가 텍스트·필드·표·상자·선을 PDF에 그리고 이미지 자리는 점선으로 표시하게 했다.
  - `PdfDocumentRenderer`가 폰트 서브셋·임베딩, z 순서 렌더, preview 워터마크를 조율하게 했다.
  - 생성된 `apps/poc/generated-payslip.pdf`를 Quick Look PNG로 변환해 참고 양식과 같은 큰 구조를 확인했다.
  - `npm test`: 테스트 파일 31개, 테스트 123개 통과.
  - `npm run typecheck:core`, `npm run typecheck:renderer`: 통과.
  - 고정 이미지는 `ImageProvider`, 데이터 이미지는 바인딩된 `ImageAsset`으로 실제 PNG/JPEG를 임베딩하게 했다.
  - 원본·서브셋 폰트의 `ISU-20194` advance width가 동일하고 PNG 표현도 같아 서브셋 원인이 아님을 확인했다.
  - `subset-font`의 Node 의존성을 반영해 preview와 authoritative PDF를 모두 서버에서 생성하도록 결정했다.
  - 브라우저 직접 실행 차단과 서버 preview 워터마크를 자동 테스트로 검증했다.
  - `npm test`: 테스트 파일 31개, 테스트 128개 통과.
  - `npm run typecheck:core`, `npm run typecheck:renderer`: 통과.
  - 사용자 실습: 고정 이미지가 있는데 `ImageProvider`를 주입하지 않으면 명시적 예외가 나는 테스트 추가 대기.
  - 사용자 실습에서 고정 `ImageElement`와 비동기 예외 assertion을 올바르게 구성했다.
  - `toThrow(string)`이 완전 일치가 아닌 부분 문자열 포함 검사라는 Vitest 동작을 확인하고 기대 문구를 정리했다.
  - Phase 8 학습 확인 완료. 전체 검증과 커밋 후 Phase 9로 진행한다.
- 2026-08-22: Phase 9 T44 구현 완료.
  - `@report-tool/designer` workspace와 React·Konva 런타임 및 React 타입 의존성을 구성했다.
  - JSX 변환을 `react-jsx`로 지정하고 TypeScript 입력에 `.ts`와 `.tsx`를 모두 포함했다.
  - `npm run typecheck:designer`: 통과.
  - T44는 패키지 기반만 만드는 작업이므로 새 런타임 테스트를 작성하지 않았다.
  - 사용자 실습으로 공개 진입점에 패키지 식별 상수를 추가했고 타입 검사를 통과했다.
  - `const` 문자열 값이 별도의 `as const` 없이도 리터럴 타입으로 추론되는 동작을 확인했다.
  - T44 학습 확인 완료. 전체 검증과 커밋 후 T45로 진행할 수 있다.
