import { Binding, FieldElement, type Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/** 필드 경로 변경을 검증 가능한 undo 단위로 보존한다. */
export class BindFieldCommand extends EditorCommand {
  /** 변경 전후 바인딩을 모두 받아 취소 시 원래 필드 설정을 복원한다. */
  constructor(
    private readonly elementId: string,
    private readonly beforeBinding: Binding,
    private readonly afterBinding: Binding,
  ) {
    super();
  }

  /** 선택한 데이터 경로를 대상 필드에 적용한다. */
  execute(template: Template): Template {
    return this.replaceBinding(template, this.afterBinding);
  }

  /** 대상 필드의 이전 데이터 경로를 복원한다. */
  undo(template: Template): Template {
    return this.replaceBinding(template, this.beforeBinding);
  }

  /**
   * 필드가 아닌 요소를 차단하면서 바인딩만 교체한다.
   *
   * 생성자로 직접 다시 만들지 않는 이유는, 요소에 공통 상태가 추가될 때
   * 이곳에서 조용히 빠뜨리면 잠금·숨김이 초기화되기 때문이다.
   */
  private replaceBinding(template: Template, binding: Binding): Template {
    return template.replaceElement(this.elementId, (element) => {
      if (!(element instanceof FieldElement)) {
        throw new Error("FieldElement가 아닌 요소에는 바인딩을 걸 수 없다");
      }
      return element.withBinding(binding);
    });
  }
}
