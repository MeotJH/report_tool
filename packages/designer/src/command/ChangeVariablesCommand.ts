import type { TemplateVariable, Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/**
 * 사용자가 정의한 변수 목록 변경을 요소 편집과 같은 이력에 남긴다.
 *
 * 변수는 문서가 요구하는 데이터의 계약이므로, 실수로 지운 선언을 되돌릴 수 없으면
 * 그 선언을 참조하던 요소들이 조용히 빈칸이 된다.
 */
export class ChangeVariablesCommand extends EditorCommand {
  /** 변경 전후 목록을 모두 보존해 실행과 취소를 대칭으로 만든다. */
  constructor(
    private readonly before: readonly TemplateVariable[],
    private readonly after: readonly TemplateVariable[],
  ) {
    super();
  }

  /** 초안의 변수 목록을 변경 후 값으로 교체한다. */
  execute(template: Template): Template {
    return template.withVariables(this.after);
  }

  /** 초안의 변수 목록을 변경 전 값으로 되돌린다. */
  undo(template: Template): Template {
    return template.withVariables(this.before);
  }
}
