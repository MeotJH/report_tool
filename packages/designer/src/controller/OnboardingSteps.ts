/** 지금 문서에서 읽어 낼 수 있는, 온보딩 판단에 필요한 사실만 모은 것이다. */
export interface OnboardingFacts {
  readonly variableCount: number;
  readonly elementCount: number;
  readonly tableCount: number;
  readonly hasSaved: boolean;
  readonly hasPreviewed: boolean;

  /** 호스트가 보관소를 줬는가. 없으면 저장을 시킬 수 없다. */
  readonly canSave: boolean;

  /** 호스트가 렌더 경로를 줬는가. 없으면 미리보기를 시킬 수 없다. */
  readonly canPreview: boolean;
}

/** 처음 쓰는 사람에게 보여 줄 한 단계다. */
export interface OnboardingStep {
  readonly title: string;
  readonly hint: string;
  readonly done: boolean;
}

/**
 * 백지에서 시작한 사람에게 다음에 할 일을 순서대로 알려 준다.
 *
 * 백지로 열면 캔버스도 레이어도 데이터 목록도 비어 있다. 기능은 다 있는데 **어느
 * 것을 먼저 눌러야 하는지가 어디에도 없다.** 실제로 백지에서 만들어 보며 막힌
 * 지점이 그 순서였다 — 변수를 먼저 선언해야 표를 데이터에 연결할 수 있는데, 그
 * 사실은 표를 만들어 본 뒤에야 드러난다.
 *
 * 읽어 주기만 하는 안내문이 아니라 **지금 문서를 보고 판단한다.** 이미 한 일은
 * 끝난 것으로 표시된다. 안내가 문서와 따로 놀면 사람은 그것을 읽지 않게 된다.
 *
 * 호스트가 주지 않은 기능은 단계에서 뺀다. 저장할 곳이 없는 편집기에서 "저장하기"를
 * 시키면, 사람은 있지도 않은 단추를 찾느라 화면을 뒤진다.
 */
export class OnboardingSteps {
  /** 지금 문서 상태에 맞는 단계 목록을 만든다. */
  static from(facts: OnboardingFacts): readonly OnboardingStep[] {
    return [
      {
        title: "데이터 모양 정하기",
        hint: "왼쪽 [데이터]에서 ⇥ 샘플에서 만들기를 누르면 호스트가 준 샘플로 선언이 한 번에 생깁니다.",
        done: facts.variableCount > 0,
      },
      {
        title: "문서에 요소 놓기",
        hint: "위 도구줄에서 텍스트·표·이미지를 고르고 종이 위에 끌어 놓습니다.",
        done: facts.elementCount > 0,
      },
      {
        title: "표를 데이터에 연결하기",
        hint: "표를 고른 뒤 [표 구조]에서 행 출처를 고르거나, 엑셀에서 복사해 붙여넣습니다.",
        done: facts.tableCount > 0,
      },
      ...(facts.canSave ? [{
        title: "저장하기",
        hint: "머리줄의 저장을 누릅니다. 새로고침해도 남습니다.",
        done: facts.hasSaved,
      }] : []),
      ...(facts.canPreview ? [{
        title: "PDF로 확인하기",
        hint: "머리줄의 PDF 미리보기로 발행본과 같은 파일을 열어 봅니다.",
        done: facts.hasPreviewed,
      }] : []),
    ];
  }

  /** 남은 단계가 없으면 안내를 걷는다. 다 한 사람에게 계속 보이면 방해가 된다. */
  static isComplete(steps: readonly OnboardingStep[]): boolean {
    return steps.every((step) => step.done);
  }
}
