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
| 6 | T29~T32 Application 포트 | 미착수 | 미착수 | - |
| 7 | T33~T37 Application 서비스 | 미착수 | 미착수 | - |
| 8 | T38~T43 PDF Renderer | 미착수 | 미착수 | - |
| 9 | T44~T57 Designer | 미착수 | 미착수 | - |
| 10 | T58~T63 Viewer | 미착수 | 미착수 | - |
| 11 | T64~T68 Server HTTP 계층 | 미착수 | 미착수 | - |
| 12 | T69~T73 참조 어댑터 | 미착수 | 미착수 | - |
| 13 | T74~T77 데모 앱 | 미착수 | 미착수 | - |
| 14 | T78 통합 검증 | 미착수 | 미착수 | - |

## 현재 학습 게이트

- 다음 구현 대상: Phase 6, T29~T32
- 사용자 실습: Phase 5 실습은 사용자 요청으로 생략
- 다음 Phase 진행 가능 여부: Phase 5 커밋 후 가능

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
