# Phase 9 반복 학습 — 표 편집 Command

이 문서는 표 편집 기능이 많아진 뒤에도 변경 책임과 Undo 흐름을 다시 따라갈 수 있게 만든
학습 지도다. 캔버스 조작법이 아니라 UI 아래에서 표 변경이 안전하게 기록되는 원리를 다룬다.

## 왜 UI가 표를 직접 변경하지 않는가

셀 입력, 행 추가, 열 너비 조절은 서로 다른 화면 동작이지만 모두 `TableElement`를 변경한다.
캔버스가 이 규칙을 직접 가지면 Inspector에서도 같은 검증을 다시 구현해야 하고 Undo 기록도
빠지기 쉽다. 그래서 책임을 다음과 같이 분리한다.

```text
Canvas / Inspector (다음 작업)
        ↓ 사용자 행동을 의미로 변환
Table Command
        ↓ 한 번의 execute / undo
TableEditor
        ↓ 표 편집 규칙 적용
TableElement + TableSource + TableColumn
```

- `TableCommand`: 변경 전 표를 기억하고 실행·취소의 경계를 만든다.
- 구체 Command: 셀 변경, 행 추가처럼 사용자 행동 하나의 입력값을 보존한다.
- `TableEditor`: 정적 표 여부, 행·열 범위, 크기, Token key 같은 편집 규칙을 검증한다.
- Core 불변 객체: 원본을 바꾸지 않고 변경된 새 표·Source·열을 반환한다.

## 셀 입력이 저장되는 흐름

```text
UpdateTableCellCommand.execute(template)
  → 대상 id로 TableElement 확인
  → TableEditor.updateCell(table, row, columnKey, value)
  → StaticTableSource.withCell(...)
  → TableElement.withSource(...)
  → Template.replaceElement(...)
```

원래 `Template`, `TableElement`, `StaticTableSource`는 바뀌지 않는다. Command가 변경 전 표를
가지고 있으므로 Undo는 셀 값을 역연산으로 계산하지 않고 이전 표 전체를 그대로 복원한다.
열 추가처럼 열 정의와 모든 행을 함께 바꾸는 작업도 같은 방식이라 복원 누락이 없다.

## 정적 표와 데이터 표의 편집 차이

정적 표의 셀과 행은 템플릿이 소유하므로 직접 변경할 수 있다. 데이터 표의 반복 행은 발행 시
호스트 데이터에서 오기 때문에 디자이너가 원본 행을 직접 변경하지 않는다. 따라서 데이터 표는
열의 `{{row.fieldKey}}` 연결만 편집하고, 직접 셀 입력은 명확한 오류로 차단한다.

정적↔데이터 전환은 `ChangeTableSourceCommand`가 담당한다. Undo하면 교체 전 Source 인스턴스가
복원되므로 정적 표에 입력했던 행도 사라지지 않는다.

## 테스트가 보장하는 것

`TableCommands.test.ts`는 다음을 확인한다.

- 정적 셀, 행·열, 헤더, 열 너비, 행 높이, 헤더 표시 변경 결과
- 열 추가·삭제 시 정적 행의 셀 key도 함께 추가·삭제되는 불변성
- Source 전환 후 Undo 시 기존 정적 행 복원
- 데이터 Token 연결 시 key, 표현식, 선택적 헤더 변경
- 잘못된 표·행·열·크기·Token 입력의 예외와 실패 명령의 Undo 상태 미생성
- 11개 명령 전체를 실행→역순 Undo→동일 순서 Redo했을 때 처음·최종 상태 복원

아직 보장하지 않는 것은 더블클릭 입력기, Tab 이동, IME, 셀 선택 표시, 행·열 버튼 같은 실제
브라우저 상호작용이다. 이것은 T57-D 이후의 UI 테스트와 수동 시나리오에서 검증한다.

## 다시 실행할 검증

```bash
npx vitest run packages/designer/src/command/TableCommands.test.ts
npm run typecheck:core
npm run typecheck:designer
npm test
```

## 작은 실습

`TableCommands.test.ts`에 “데이터 표에서 `AddTableRowCommand`를 실행하면 예외가 나고 원본
Source가 유지된다” 테스트를 먼저 추가한다. 현재 구현으로 통과하는지 확인한 뒤, 왜 행 추가가
정적 표에만 허용되어야 하는지 `TableEditor.staticSource()`의 역할과 연결해 설명해 본다.

성공 기준은 새 테스트를 포함한 명령 테스트 전체 통과다. 제품 동작을 바꾸지 않는 복습용
실습이므로 이후에도 여러 번 다시 수행할 수 있다.
