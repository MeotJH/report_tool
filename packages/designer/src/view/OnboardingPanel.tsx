import { useState, useSyncExternalStore } from "react";
import type { DocumentPreview } from "../controller/DocumentPreview.js";
import type { EditorController } from "../controller/EditorController.js";
import { OnboardingSteps, type OnboardingStep } from "../controller/OnboardingSteps.js";
import type { TemplateFiling } from "../controller/TemplateFiling.js";

/**
 * 처음 쓰는 사람에게 다음에 할 일 하나를 캔버스 바로 위에 보여 준다.
 *
 * 백지로 열면 캔버스도 레이어도 데이터 목록도 비어 있다. 기능은 다 있는데 **어느
 * 것을 먼저 눌러야 하는지가 어디에도 없다.**
 *
 * 다섯 줄을 한꺼번에 늘어놓지 않는다. 지금 할 일 하나만 크게 보여 주고 나머지는
 * 번호로 둔다. 처음 보는 사람에게 할 일 다섯 개를 동시에 주면 어느 것부터인지
 * 다시 고르게 만든다.
 */
export function OnboardingPanel(props: {
  controller: EditorController;
  filing: TemplateFiling;
  preview: DocumentPreview;
}) {
  const [dismissed, setDismissed] = useState(false);
  useSyncExternalStore(
    (listener) => props.filing.subscribe(listener),
    () => props.filing.hasEverSaved(),
  );
  useSyncExternalStore(
    (listener) => props.preview.subscribe(listener),
    () => props.preview.hasEverOpened(),
  );
  const steps = OnboardingSteps.from(readFacts(props));
  const current = steps.find((step) => !step.done);
  if (dismissed || current === undefined) return null;
  return (
    <div className="rt-onboarding" role="note">
      <span className="rt-onboarding-marks">
        {steps.map((step, index) => (
          <StepMark key={step.title} step={step} order={index + 1} current={step === current} />
        ))}
      </span>
      <span className="rt-onboarding-now">
        <strong>{current.title}</strong> {current.hint}
      </span>
      <button
        className="rt-onboarding-close"
        type="button"
        aria-label="안내 닫기"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  );
}

/** 끝난 단계·지금 단계·아직인 단계를 번호 하나로 구분해 보여 준다. */
function StepMark(props: { step: OnboardingStep; order: number; current: boolean }) {
  const className = props.step.done
    ? "rt-onboarding-mark rt-onboarding-mark--done"
    : props.current
      ? "rt-onboarding-mark rt-onboarding-mark--now"
      : "rt-onboarding-mark";
  return <span className={className} title={props.step.title}>{props.step.done ? "✓" : props.order}</span>;
}

/**
 * 지금 문서에서 판단에 필요한 사실만 읽어 낸다.
 *
 * 안내가 문서와 따로 놀면 사람은 그것을 읽지 않게 된다. 이미 한 일은 반드시 끝난
 * 것으로 보여야 한다.
 */
function readFacts(props: {
  controller: EditorController;
  filing: TemplateFiling;
  preview: DocumentPreview;
}) {
  const template = props.controller.getTemplate();
  const elements = template.getElements();
  return {
    variableCount: template.variables.length,
    elementCount: elements.length,
    tableCount: elements.filter((element) => element.type === "table").length,
    hasSaved: props.filing.hasEverSaved(),
    hasPreviewed: props.preview.hasEverOpened(),
    canSave: props.filing.isAvailable(),
    canPreview: props.preview.isAvailable(),
  };
}
