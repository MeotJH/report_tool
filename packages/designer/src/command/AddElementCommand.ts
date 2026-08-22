import type { Element, Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/** 요소 추가를 취소 가능한 편집 작업으로 기록한다. */
export class AddElementCommand extends EditorCommand {
  /** 추가할 불변 요소를 명령 수명 동안 보존한다. */
  constructor(private readonly element: Element) {
    super();
  }

  /** 현재 초안에 보존한 요소를 추가한다. */
  execute(template: Template): Template {
    return template.addElement(this.element);
  }

  /** 추가했던 요소의 ID로 실행 전 목록을 복원한다. */
  undo(template: Template): Template {
    return template.removeElement(this.element.id);
  }
}
