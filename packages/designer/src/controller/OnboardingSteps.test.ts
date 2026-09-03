import { describe, expect, it } from "vitest";
import { OnboardingSteps, type OnboardingFacts } from "./OnboardingSteps.js";

describe("OnboardingSteps", () => {
  it("백지에서는 어느 단계도 끝나 있지 않다", () => {
    const steps = OnboardingSteps.from(blankDocument());

    expect(steps.every((step) => !step.done)).toBe(true);
  });

  it("무엇부터 할지 순서대로 알려 준다", () => {
    const steps = OnboardingSteps.from(blankDocument());

    expect(steps.map((step) => step.title)).toEqual([
      "데이터 모양 정하기",
      "문서에 요소 놓기",
      "표를 데이터에 연결하기",
      "저장하기",
      "PDF로 확인하기",
    ]);
  });

  it("선언한 변수가 있으면 첫 단계를 끝난 것으로 본다", () => {
    const steps = OnboardingSteps.from({ ...blankDocument(), variableCount: 36 });

    expect(steps[0]?.done).toBe(true);
  });

  it("요소를 놓으면 두 번째 단계가 끝난다", () => {
    const steps = OnboardingSteps.from({ ...blankDocument(), elementCount: 1 });

    expect(steps[1]?.done).toBe(true);
  });

  it("표를 놓으면 세 번째 단계가 끝난다", () => {
    const steps = OnboardingSteps.from({ ...blankDocument(), tableCount: 1 });

    expect(steps[2]?.done).toBe(true);
  });

  it("한 번이라도 저장했으면 네 번째 단계가 끝난다", () => {
    const steps = OnboardingSteps.from({ ...blankDocument(), hasSaved: true });

    expect(steps[3]?.done).toBe(true);
  });

  it("미리보기를 열어 봤으면 마지막 단계가 끝난다", () => {
    const steps = OnboardingSteps.from({ ...blankDocument(), hasPreviewed: true });

    expect(steps[4]?.done).toBe(true);
  });

  it("호스트가 보관소를 주지 않으면 저장 단계를 아예 빼놓는다", () => {
    const steps = OnboardingSteps.from({ ...blankDocument(), canSave: false });

    expect(steps.map((step) => step.title)).not.toContain("저장하기");
  });

  it("호스트가 렌더 경로를 주지 않으면 미리보기 단계를 빼놓는다", () => {
    const steps = OnboardingSteps.from({ ...blankDocument(), canPreview: false });

    expect(steps.map((step) => step.title)).not.toContain("PDF로 확인하기");
  });

  it("남은 단계가 없으면 더 보여 주지 않는다", () => {
    expect(OnboardingSteps.isComplete(OnboardingSteps.from(finishedDocument()))).toBe(true);
  });

  it("한 단계라도 남아 있으면 계속 보여 준다", () => {
    expect(OnboardingSteps.isComplete(OnboardingSteps.from(blankDocument()))).toBe(false);
  });
});

/** 요소도 선언도 없는, 방금 만든 문서다. */
function blankDocument(): OnboardingFacts {
  return {
    variableCount: 0,
    elementCount: 0,
    tableCount: 0,
    hasSaved: false,
    hasPreviewed: false,
    canSave: true,
    canPreview: true,
  };
}

/** 다섯 단계를 모두 지난 문서다. */
function finishedDocument(): OnboardingFacts {
  return {
    variableCount: 3,
    elementCount: 5,
    tableCount: 1,
    hasSaved: true,
    hasPreviewed: true,
    canSave: true,
    canPreview: true,
  };
}
