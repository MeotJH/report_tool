# 클론코딩 가이드

이 문서는 **"어떻게 만들었는지"를 기능 단위로 다시 물어볼 수 있게** 만든 색인이다.

각 단위는 커밋 하나에 대응한다. 커밋 하나 = 되짚을 수 있는 학습 단위 하나가 되도록
레이어와 기능으로 끊었다. 순서대로 따라가면 같은 결과에 도달한다.

## 이 문서를 쓰는 법

물어볼 때는 **단위 번호로** 부른다.

> "D2 클론코딩 해줘" → 단위 D2를 처음부터 다시 만드는 과정을 단계별로 설명한다
> "U3 왜 그렇게 했어?" → 단위 U3의 설계 판단만 되짚는다

| 접두사 | 레이어 | 실행 환경 |
|---|---|---|
| **D** | `packages/core` — domain / application | isomorphic |
| **R** | `packages/renderer` — PDF 출력 | node |
| **U** | `packages/designer` — 편집 화면 | browser |

**의존 방향은 항상 D → R·U다.** D를 먼저 만들지 않으면 R·U를 만들 수 없다.
클론코딩 순서도 같다.

각 단위의 코드는 `git show <해시>`로 통째로 볼 수 있다.

---

## 1차: 데이터 목록의 근거를 하나로 (D1 · U1)

### D1. 호스트가 주던 필드 스키마를 없앤다
`a0a3cef` · `packages/core/src/application/port/DataProvider.ts`, `index.ts`

**무엇을 푸는가**
연결 가능한 데이터 목록의 근거가 두 곳이었다. 호스트가 넘기는 `FieldSchema`와
템플릿이 선언한 `variables`. 같은 경로가 양쪽에 있으면 어느 쪽이 실제로 쓰이는지
화면에서도 코드에서도 판단할 수 없다.

**왜 이렇게 했는가**
근거는 하나여야 한다. 문서가 무엇을 필요로 하는지 아는 사람은 그 문서를 설계하는
담당자이므로, 템플릿의 `variables`를 유일한 근거로 남기고 `DataProvider`는 미리보기와
발행에 쓸 **데이터만** 공급하게 했다.

**만드는 순서**
1. `DataProvider`에서 `FieldSchema` 타입과 `fields()` 메서드를 지운다
2. `core/index.ts`의 `FieldSchema` export를 지운다
3. 타입 검사를 돌려 무너지는 곳을 전부 찾는다 — 그게 U1의 작업 목록이 된다

**완료 확인** `npm run typecheck:core` 통과.

---

### U1. 데이터 팔레트를 템플릿 선언만으로 만든다
`3adb1f3` · `PaletteEntry.ts`, `FieldPalette.tsx`, `Designer.ts`, `DesignerShell.tsx`

**무엇을 푸는가** D1이 무너뜨린 편집기 쪽을 다시 세운다.

**만드는 순서**
1. `PaletteEntryBuilder.build(variables)` — 인자를 하나로 줄인다.
   평평한 점 경로(`employee.phone`)를 트리로 만드는 책임만 남긴다
2. `PaletteEntry`에서 `origin`·`sensitive`를 지운다
3. `DesignerOptions`에서 `fields`를 지운다 → `DesignerShell` prop도 함께
4. `FieldPalette`의 출처 배지를 타입 배지로 바꾸고, 삭제 버튼을 모든 행에 연다
5. playground를 `TemplateVariable` 선언으로 바꾼다

**놓치기 쉬운 것**
`sensitive`의 유일한 출처가 호스트 스키마였다. 지우면 **민감 필드 마스킹 자동 제안이
함께 사라진다.** 기능이 조용히 없어지지 않도록 `TASKS_NEXT.md`의 N07로 등록했다.

**완료 확인** 팔레트의 모든 행이 편집·삭제 가능하고, 배지가 타입만 보여 준다.

---

## 2차: 편집기와 발행본을 일치시킨다 (D2 · R1 · U3)

이 묶음이 이 프로젝트에서 **가장 중요하다.** 캔버스와 PDF가 서로 다른 코드로
서로 다르게 틀리고 있었고, 그래서 담당자가 본 문서와 서명자가 받은 문서가 달랐다.

### D2. 문단을 지키는 TextLayout을 도메인으로 옮긴다
`3e492dc` · `packages/core/src/domain/text/TextLayout.ts`

**무엇을 푸는가**
`PdfTextLayout`이 사용자가 넣은 줄바꿈(`\n`)을 몰랐다. `WrapTextStrategy`가 공백으로만
쪼개서 `"말한다.\n1. 제품의 …\n3."`이 한 줄로 묶였고, pdf-lib이 그 안의 `\n`을 자기
줄높이로 또 쪼갰다. 두 줄바꿈 체계가 충돌해 서약서 제1조 각 호가 **3→1→4→2 순서로
겹쳐** 발행됐다.

**왜 도메인인가**
캔버스와 PDF가 각자 줄을 나누면 반드시 어긋난다. 계산은 하나여야 하므로 domain에 둔다.
**폭 측정만** `TextWidthMeasurer` 콜백으로 받는다 — domain은 폰트를 몰라야 한다.

**만드는 순서**
1. `renderer/pdf/PdfTextLayout.ts`를 `core/domain/text/TextLayout.ts`로 옮긴다
2. `layout()`이 가장 먼저 `text.split("\n")`으로 문단을 나누게 한다
3. 문단마다 기존 전략(wrap/shrink/truncate)을 적용하고 줄을 이어 붙인다
4. shrink는 문단마다 다른 배율을 낼 수 있으므로 **가장 작은 크기로 통일**한다
5. `heightMm()`을 더한다 — 넘침 판정에 쓴다

**완료 확인** `lines.every(line => !line.includes("\n"))`. 5줄짜리 조문이 5줄로 나온다.

---

### R1. 줄 계산과 셀 해석을 도메인에서 가져다 쓴다
`e86d166` · `PdfElementVisitor.ts`, `PdfDocumentRenderer.ts`, `UsedCharCollector.ts`

**무엇을 푸는가** 렌더러가 자기 계산을 버리고 도메인 것을 쓴다.

**놓치기 쉬운 것 — 여기가 함정이다**
`UsedCharCollector`도 표 셀을 해석한다. **폰트 수집이 렌더링과 다른 규칙을 쓰면
치환된 한글이 서브셋에서 빠져 발행본에 통째로 빈칸으로 나온다.** 세 곳(캔버스 포함)이
같은 계산을 쓰는 것이 정확성의 조건이다.

**완료 확인** `npm test`와 `npm run typecheck:renderer` 통과, 서약서 PDF 재발행.

---

### U3. 캔버스가 도메인 줄 계산을 쓰고 넘침을 숨기지 않는다
`03da300` · `CanvasTextMeasurer.ts`(신규), `KonvaElementVisitor.ts`, `TemplateIssueFinder.ts`

**무엇을 푸는가**

| | 이전 캔버스 | 이전 PDF |
|---|---|---|
| 문단 줄바꿈 | Konva가 지켰다 | **무시했다** |
| 넘치는 줄 | **조용히 지웠다** (`Konva.Text`에 height를 주면 안 그린다) | `frame.height`를 보지 않고 전부 그렸다 |

둘 다 틀렸고, **서로 다르게** 틀렸다.

**만드는 순서**
1. `CanvasTextMeasurer` — 2D 컨텍스트로 폭을 잰다. 브라우저 API를 만나는 곳은 여기뿐
2. `KonvaElementVisitor.createTextNode`가 `TextLayout`으로 줄을 계산하고,
   Konva에는 `wrap: "none"` + 계산된 줄만 넘긴다
3. 넘치면 `height`를 비워 Konva가 자르지 않게 하고 `verticalAlign`을 top으로 되돌린다
4. `TemplateIssueFinder`가 "문구 N줄이 요소 높이보다 길다"를 경고한다
   — **어느 쪽도 조용히 지우거나 조용히 넘치지 않는다**

**남는 차이** 두 측정기의 글리프 metric이 완전히 같지는 않아 경계 어절에서 드물게 줄이
갈릴 수 있다. 완전한 일치는 PDF 미리보기(`TASKS.md` T57-V)가 닫는다.

**완료 확인** 서약서 4호가 캔버스·PDF 양쪽에 다 나오고, 편집기가
`문구 5줄이 요소 높이보다 길다 (29mm 필요)`를 표시한다.

---

## 3차: 표를 쓸 수 있게 만든다 (U2 · D3 · U4)

### U2. 표 열 너비 합을 표 프레임 안에 유지한다
`ea50516` · `TableColumnFitter.ts`(신규), `TableEditor.ts`, `TemplateIssueFinder.ts`

**무엇을 푸는가**
`＋ 열 추가`가 20mm를 그냥 붙였다. `110 + 60` 표에 열을 더하면 합이 190mm인데 프레임은
170mm 그대로여서, 새 열이 **표 밖이자 A4 오른쪽 끝 바깥**에 생겼다.
`findElementAt`이 `frame.contains`로 판정하므로 그 열 위에는 데이터를 놓을 수도 누를
수도 없었다. **보이는데 만질 수 없는 열**이다.

**왜 비례 축소인가**
새 열이 폭을 새로 만들지 않고 기존 열에서 나눠 받게 하면 "열 너비 합 = 프레임 너비"가
불변으로 유지된다. 비례를 지키므로 "항목 열이 금액 열보다 넓다"는 의도도 남는다.

**만드는 순서**
1. `TableColumnFitter.fitToWidth(columns, totalWidthMm)` — 비례 유지 + 최소 폭 보장
2. 반올림 오차를 가장 넓은 열이 흡수하게 한다. 안 하면 열을 더할 때마다 오차가 쌓인다
3. `TableEditor.addColumn`/`removeColumn`이 결과에 보정을 적용
4. 보정 전에 저장된 템플릿을 위해 합이 어긋난 표를 경고로 드러낸다

**완료 확인** `110 + 60` → 열 추가 → `98.43 + 53.68 + 17.89 = 170`.
새 열 중앙에 팔레트 항목을 떨어뜨리면 그 열이 연결된다.

---

### D3. 표 셀을 두 단계로 해석한다
`b92988e` · `TableCellResolver.ts`(신규), `TemplateReferences.ts`

**무엇을 푸는가**
급여명세서 표의 대부분은 **항목 이름은 모든 문서에서 같고 금액만 사람마다 다르다.**
그런데 `TableSource`는 정적(전부 템플릿 저장)이거나 데이터(전부 배열)뿐이었다.
정적 셀에 `{{baseSalary}}`를 적으면 문자 그대로 발행됐고 경고도 없었다.

**설계**
1. 열의 `cellTemplate`(`{{row.amount}}`)이 **행에서** 값을 꺼낸다
2. 그 값이 다시 표현식이면 **문서 데이터로** 채운다

치환은 정확히 두 번이다. 데이터가 데이터를 가리키게 두면 순환을 막을 수 없고,
무엇이 찍힐지 사람이 읽어서 예측할 수도 없다.

**만드는 순서**
1. `TableCellResolver.resolve(column, row, data)` — 두 번의 `TemplateExpression.render`
2. `resolveRow` / `resolveRowSource` — 후자는 설계 화면용(1단계까지만)
3. `TemplateReferences`가 정적 셀 안의 경로도 모으게 한다 → 오타가 경고로 잡힌다

**완료 확인** `기본급 | {{pay.base}}` 표가 PDF에서 `기본급 | 4200000`으로 나오고,
같은 표에 섞은 순수 고정 문구 행은 그대로 유지된다.

---

### U4. 정적 표의 저장된 행을 설계 화면에 보여준다
`0e0ddf0` · `KonvaElementVisitor.ts`

**무엇을 푸는가**
정적 표가 설계 모드에서 저장된 행 대신 `⟨key⟩` 한 줄만 보여 줬다. 행이 3개여도 화면에는
1줄. 그런데 `TableCellLocator`는 3행 전부를 편집 대상으로 인정하므로,
**보이지 않는 칸을 더블클릭해 편집하는** 상태였다.

**설계 판단**
정적 행은 데이터가 아니라 사용자가 템플릿에 써 넣은 문서 내용이므로 전부 그린다.
다만 셀에 적은 표현식은 **값으로 바꾸지 않는다** — 캔버스에 금액이 보이는데 그 칸을
더블클릭하면 표현식이 나타나면 둘이 어긋난다. 설계는 "무엇이 연결됐는가",
미리보기는 "무엇이 찍히는가"를 보여 준다.

**완료 확인** 정적 행 3개가 각각 그려진다(Konva 씬 그래프에서 6개 Text).

---

## 되짚을 때 쓰는 명령

```bash
git show <해시>              # 단위 하나의 전체 변경
git show <해시> --stat       # 어떤 파일이 바뀌었는지만
git log --oneline --reverse  # 단위 순서
npx vitest run               # 전체 검증
```

## 다음 단위

[TASKS_NEXT.md](TASKS_NEXT.md)의 N04부터가 다음 클론코딩 단위가 된다.
같은 규칙으로 커밋 하나 = 단위 하나로 끊고 이 문서에 이어 붙인다.
