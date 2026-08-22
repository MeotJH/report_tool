import type { Element, Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/**
 * 요소의 배치 외 속성 변경 전체를 하나의 교체 작업으로 기록한다.
 *
 * 요소는 불변이므로 스타일·문구·바인딩·표현·잠금·숨김·순서 변경은 모두
 * "다른 인스턴스로 바꾼다"와 같다. 속성마다 명령 클래스를 만들면 Inspector
 * 항목이 늘어날 때마다 같은 모양의 클래스가 계속 늘어나므로 한곳에 모은다.
 */
export class ChangeElementCommand extends EditorCommand {
  /** 변경 전후 요소를 모두 보존해 실행과 취소를 대칭으로 만든다. */
  constructor(
    private readonly before: Element,
    private readonly after: Element,
  ) {
    super();
    if (before.id !== after.id) {
      throw new Error("서로 다른 요소를 변경 전후로 묶을 수 없다");
    }
  }

  /** 대상 요소를 변경 후 인스턴스로 교체한다. */
  execute(template: Template): Template {
    return template.replaceElement(this.before.id, () => this.after);
  }

  /** 대상 요소를 변경 전 인스턴스로 되돌린다. */
  undo(template: Template): Template {
    return template.replaceElement(this.before.id, () => this.before);
  }
}
