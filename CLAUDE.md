# report-tool

브라우저 캔버스로 서류 양식(급여명세서·계약서)을 직접 설계하고, DB 데이터를 결합해
발행·배포·전자서명까지 처리하는 **임베더블 자바스크립트 라이브러리**.

특정 서비스에 종속되지 않으며, 호스트 애플리케이션에 붙여서 사용한다.

- 제품 상세: [docs/PRODUCT.md](docs/PRODUCT.md)
- 코드 구조: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **호스트가 Node가 아닐 때(Spring·Flask)**: [docs/HOST_API.md](docs/HOST_API.md) — REST 계약.
  실행본은 [apps/sidecar](apps/sidecar/README.md)
- 전체 요약: [docs/SUMMARY.md](docs/SUMMARY.md)
- **구현 작업 목록 (T01~T78)**: [docs/TASKS.md](docs/TASKS.md) — 항상 번호가 낮은 작업부터 진행한다.
  Phase 0~14 완료. 데모 호스트는 [apps/demo-host](apps/demo-host/README.md)에서
  저장→발행 표시→발행→링크→열람→서명까지 실제로 걸어 확인했다
- 문서 유형별 기능 공백(임금명세서·비밀유지서약서): [docs/PAYSLIP_GAP_ANALYSIS.md](docs/PAYSLIP_GAP_ANALYSIS.md)
- **공백을 메우는 다음 작업 (N00~N19)**: [docs/TASKS_NEXT.md](docs/TASKS_NEXT.md) — T78 이후 진행 순서.
  N00~N07·N10·N16~N18 완료. 다음은 **N08(계산식) → N09(합계 행)**
- **리포트형 문서 로드맵 (완료)**: [docs/REPORT_ROADMAP.md](docs/REPORT_ROADMAP.md) — 월간 서비스 리포트 기준. 1~13단계 전부 끝났다.
  이후는 [docs/TASKS.md](docs/TASKS.md)의 Phase 10~14(T58~T78)로 돌아간다
- **기능별 클론코딩 색인**: [docs/CLONE_GUIDE.md](docs/CLONE_GUIDE.md) — 커밋 하나 = 학습 단위 하나

---

## 개발 규칙 (예외 없음)

### 1. TypeScript + OOP
- 모든 코드는 TypeScript로 작성한다. `any` 금지.
- 로직은 클래스에 담는다. 떠도는 유틸 함수를 남발하지 않는다.
- 동작이 여러 갈래로 나뉘면 `if/switch` 나열 대신 **다형성**으로 푼다.

### 2. 가독성 우선
- 한 메서드는 한 가지 일만 한다. 20줄을 넘으면 쪼갠다.
- 이름은 줄이지 않는다. `tpl` 대신 `template`, `el` 대신 `element`.
- 영리한 한 줄보다 지루한 세 줄을 택한다.

### 3. 한글 주석 의무
- **모든 클래스·메서드 위에 그 역할을 설명하는 한글 주석을 단다.**
- 무엇을 하는지가 아니라 **왜 존재하는지**를 쓴다.
- 형식은 JSDoc(`/** ... */`)을 사용한다.

### 4. Layered Architecture
```
presentation  →  application  →  domain
infrastructure  →  application  →  domain
```
- **의존은 항상 안쪽(domain)을 향한다.** 역방향 import는 금지다.
- `domain`은 어떤 외부 패키지도 import하지 않는다. 브라우저 API도 Node API도 모른다.
- 바깥 세계(DB·파일·네트워크·캔버스)는 `application/port`의 인터페이스로만 만난다.

### 5. 과한 구조 금지
- 레이어는 이 4개가 전부다. 더 쪼개지 않는다.
- 사용하는 패턴은 5개로 제한한다: **Visitor, Strategy, Command, Port&Adapter, Factory**.
- 이벤트 소싱·CQRS·DI 컨테이너는 쓰지 않는다. 생성자 주입으로 충분하다.
- 추상화는 두 번째 구현체가 실제로 필요해질 때 만든다.

---

## 절대 바꾸지 않는 결정

| 결정 | 이유 |
|---|---|
| 좌표 단위는 **mm** | px로 저장하면 PDF·인쇄에서 어긋난다 |
| `schemaVersion` 필드 유지 | 마이그레이션의 유일한 근거 |
| 캔버스 라이브러리 직렬화 결과를 저장하지 않음 | 라이브러리 버전 올릴 때 과거 문서가 깨진다 |
| 발행 시 데이터·템플릿·PDF해시 **동결** | "무엇에 서명했는가"를 증명하는 근거 |
| 라이브러리는 I/O를 직접 하지 않음 | 급여 데이터가 고객사 밖으로 나가면 안 된다 |

## 검증된 기술 제약

- `@pdf-lib/fontkit`의 `subset: true`는 **한글 글리프를 누락시킨다**(재현 확인).
  반드시 harfbuzz(`subset-font`)로 미리 서브셋한 뒤 `subset: false`로 임베딩한다.
- 한글 폰트는 **OTF가 아닌 TTF**를 쓴다. OTF(CFF 아웃라인)는 임베딩 중 예외가 발생한다.

## 명령어

```bash
npm run poc:pdf     # 한글 PDF 렌더 PoC 실행
```
