import type { Template } from "@report-tool/core";
import { EditorCommand } from "./EditorCommand.js";

/**
 * 사용자가 한 번의 행동으로 느낀 변경을 한 번의 Undo로 되돌리게 한다.
 *
 * 다중 선택 이동, 정렬, 붙여넣기처럼 여러 요소가 동시에 바뀌는 작업을
 * 개별 명령으로 쌓으면 Undo를 요소 수만큼 눌러야 해서 편집 흐름이 끊긴다.
 */
export class CompositeCommand extends EditorCommand {
  private readonly commands: readonly EditorCommand[];

  /** 실행 순서를 보존해 취소 시 정확히 역순으로 되돌릴 수 있게 한다. */
  constructor(commands: readonly EditorCommand[]) {
    super();
    if (commands.length === 0) {
      throw new Error("빈 명령 묶음은 실행할 수 없다");
    }
    this.commands = [...commands];
  }

  /** 하위 명령을 등록 순서대로 적용해 최종 템플릿 하나를 만든다. */
  execute(template: Template): Template {
    return this.commands.reduce(
      (current, command) => command.execute(current),
      template,
    );
  }

  /** 나중에 실행한 명령부터 되돌려 중간 상태가 어긋나지 않게 한다. */
  undo(template: Template): Template {
    return [...this.commands].reverse().reduce(
      (current, command) => command.undo(current),
      template,
    );
  }
}
