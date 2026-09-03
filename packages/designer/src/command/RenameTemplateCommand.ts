import type { Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/**
 * 문서 이름 변경을 요소 편집과 같은 Undo 이력에 남긴다.
 *
 * 이름은 담당자가 저장된 문서 목록에서 이 문서를 찾는 유일한 단서다. 잘못 고친
 * 것을 되돌릴 수 없으면, 무엇이 원래 이름이었는지 알아낼 방법이 없다.
 */
export class RenameTemplateCommand extends EditorCommand {
  /** 변경 전후 이름을 보존해 실행과 취소를 대칭으로 만든다. */
  constructor(
    private readonly before: string,
    private readonly after: string,
  ) {
    super();
  }

  /** 초안의 이름을 변경 후 값으로 교체한다. */
  execute(template: Template): Template {
    return template.rename(this.after);
  }

  /** 초안의 이름을 변경 전 값으로 되돌린다. */
  undo(template: Template): Template {
    return template.rename(this.before);
  }
}
