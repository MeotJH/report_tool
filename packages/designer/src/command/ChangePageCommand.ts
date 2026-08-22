import type { PageSpec, Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/**
 * 용지·방향·여백 변경을 요소 편집과 같은 Undo 이력에 남긴다.
 *
 * 페이지를 바꾸면 배치된 요소가 종이 밖으로 나갈 수 있으므로
 * 되돌릴 수 없는 설정 변경으로 두지 않는다.
 */
export class ChangePageCommand extends EditorCommand {
  /** 변경 전후 페이지 설정을 보존해 실행과 취소를 대칭으로 만든다. */
  constructor(
    private readonly before: PageSpec,
    private readonly after: PageSpec,
  ) {
    super();
  }

  /** 초안의 페이지 설정을 변경 후 값으로 교체한다. */
  execute(template: Template): Template {
    return template.withPage(this.after);
  }

  /** 초안의 페이지 설정을 변경 전 값으로 되돌린다. */
  undo(template: Template): Template {
    return template.withPage(this.before);
  }
}
