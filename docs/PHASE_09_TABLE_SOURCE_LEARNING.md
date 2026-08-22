# Phase 9 반복 학습 — 정적 표와 데이터 표 Source

이 문서는 구현 완료 여부를 표시하는 기록이 아니라, 시간이 지난 뒤에도 표 설계를 다시
이해하고 테스트로 확인하기 위한 학습 지도다.

## 왜 Source가 필요한가

기존 `TableElement`는 `Binding`을 직접 소유해 모든 표를 데이터 배열 전용으로 취급했다.
그래서 상단 표 도구로 만든 표에 고정 셀 값을 저장할 자리가 없었다. 정적 표와 데이터 표는
Frame·열·스타일·렌더링 구조는 같고 **행을 어디서 얻는가**만 다르므로 Strategy로 분리한다.

```text
TableElement
  └─ TableSource
       ├─ StaticTableSource(rows)       템플릿에서 행을 얻음
       └─ BoundTableSource(binding)     발행 데이터에서 행을 얻음
```

## 데이터가 결과로 가는 흐름

정적 표는 `StaticTableSource.resolveRows()`가 저장된 행의 복사본을 반환한다. 데이터 표는
`BoundTableSource.resolveRows(data)`가 Binding 경로를 조회하고 배열일 때만 행을 반환한다.
Designer와 PDF Renderer는 구체 Source를 구분하지 않고 `resolveRows()`만 호출한다.

```text
표 생성/복원 → TableElement.source → resolveRows(data)
            → 각 TableColumn.cellTemplate 적용 → Canvas/PDF 셀 출력
```

## 저장 호환성

새 JSON은 `source.kind`를 저장한다. `ElementFactory`는 `source`가 없는 이전 표 JSON을 만나면
기존 `binding`을 `BoundTableSource`로 감싸 복원한다. 이전 문서를 데이터 표로 해석하는 이유는
과거에는 정적 표가 존재하지 않았기 때문이다.

## 다시 실행할 테스트

```bash
npx vitest run packages/core/src/domain/element/TableSource.test.ts
npx vitest run packages/core/src/domain/element/ElementFactory.test.ts
npm test
```

- `TableSource.test.ts`: 정적 행 불변성, 데이터 배열 해석을 보장한다.
- `ElementFactory.test.ts`: 두 Source JSON 왕복과 이전 binding 형식 복원을 보장한다.
- 전체 테스트: Renderer와 Designer가 Source 변경 뒤에도 기존 데이터 표를 처리하는지 확인한다.

셀·행·열·Source 변경 Command는 T57-C에서 추가했다. 실행 흐름과 복습 방법은
`docs/PHASE_09_TABLE_COMMANDS_LEARNING.md`에서 이어진다. 캔버스 직접 입력 UI는 아직
보장하지 않으며 다음 단위인 T57-D에서 추가한다.
