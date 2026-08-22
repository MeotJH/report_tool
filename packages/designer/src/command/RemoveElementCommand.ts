import type { Element, Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/** 삭제한 원본 요소를 보존해 제거 작업을 되돌릴 수 있게 한다. */
export class RemoveElementCommand extends EditorCommand {
  private removed: Element | undefined;

  /** 나중에 삭제할 요소 ID만 받아 명령 생성과 실행 시점을 분리한다. */
  constructor(private readonly elementId: string) {
    super();
  }

  /** 실행 시점의 실제 요소를 캡처한 뒤 초안에서 제거한다. */
  execute(template: Template): Template {
    this.removed = template.getElements()
      .find((element) => element.id === this.elementId);
    if (this.removed === undefined) {
      throw new Error(`삭제할 요소 ${this.elementId}을 찾을 수 없다`);
    }
    return template.removeElement(this.elementId);
  }

  /** 캡처된 원본 요소를 다시 추가해 삭제 전 상태를 복원한다. */
  undo(template: Template): Template {
    if (this.removed === undefined) {
      throw new Error("실행되지 않은 삭제 명령은 되돌릴 수 없다");
    }
    return template.addElement(this.removed);
  }
}
