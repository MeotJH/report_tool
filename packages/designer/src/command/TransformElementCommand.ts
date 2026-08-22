import type { Frame, Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/** 이동과 크기 변경을 같은 Frame 교체 작업으로 기록한다. */
export class TransformElementCommand extends EditorCommand {
  /** 변경 전후 영역을 모두 보존해 실행과 취소를 대칭으로 만든다. */
  constructor(
    private readonly elementId: string,
    private readonly beforeFrame: Frame,
    private readonly afterFrame: Frame,
  ) {
    super();
  }

  /** 대상 요소의 나머지 속성을 유지하면서 변경 후 영역을 적용한다. */
  execute(template: Template): Template {
    return this.replaceFrame(template, this.afterFrame);
  }

  /** 대상 요소의 나머지 속성을 유지하면서 변경 전 영역을 복원한다. */
  undo(template: Template): Template {
    return this.replaceFrame(template, this.beforeFrame);
  }

  /** 실행과 취소가 동일한 불변 교체 규칙을 공유하게 한다. */
  private replaceFrame(template: Template, frame: Frame): Template {
    return template.replaceElement(
      this.elementId,
      (element) => element.withFrame(frame),
    );
  }
}
