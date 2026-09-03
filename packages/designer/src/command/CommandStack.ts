import type { Template } from "@report-tool/core";
import type { EditorCommand } from "./EditorCommand.js";

/** 편집 명령의 실행 순서를 보존해 표준 undo와 redo 동작을 제공한다. */
export class CommandStack {
  private readonly undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];

  /** 새 작업을 기록하고 갈라진 redo 이력을 폐기한다. */
  execute(command: EditorCommand, template: Template): Template {
    const next = command.execute(template);
    this.undoStack.push(command);
    this.redoStack = [];
    return next;
  }

  /** 가장 최근 작업을 취소하고 다시 실행할 수 있도록 옮긴다. */
  undo(template: Template): Template | null {
    const command = this.undoStack.pop();
    if (command === undefined) return null;
    const previous = command.undo(template);
    this.redoStack.push(command);
    return previous;
  }

  /** 가장 최근에 취소한 작업을 다시 실행하고 undo 이력으로 되돌린다. */
  redo(template: Template): Template | null {
    const command = this.redoStack.pop();
    if (command === undefined) return null;
    const next = command.execute(template);
    this.undoStack.push(command);
    return next;
  }

  /**
   * 이력을 통째로 비운다. 다른 문서를 열 때 쓴다.
   *
   * 앞 문서의 명령을 남겨 두면 실행 취소가 지금 문서에 앞 문서의 요소를 되살린다.
   * 명령은 자기가 어느 문서의 것인지 모르기 때문이다.
   */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack = [];
  }

  /** UI가 실행 불가능한 undo 버튼을 미리 비활성화하게 한다. */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** UI가 실행 불가능한 redo 버튼을 미리 비활성화하게 한다. */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
