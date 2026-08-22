import type { EditorActions } from "../controller/EditorActions.js";
import type { EditorController } from "../controller/EditorController.js";
import {
  EditorKeyboardController,
  type EditorViewCommands,
} from "../controller/EditorKeyboardController.js";

/** Shadow DOM의 실제 키 이벤트를 테스트 가능한 편집기 단축키 규칙에 연결한다. */
export class KeyboardShortcutAdapter {
  private readonly keyboardController: EditorKeyboardController;

  /** 제거 시 같은 참조를 사용하도록 키 입력 리스너를 인스턴스에 보존한다. */
  private readonly keyDownListener = (event: KeyboardEvent): void => {
    this.keyboardController.handle(event);
  };

  /** Space를 뗀 순간 화면 이동 상태를 해제하도록 같은 참조를 보존한다. */
  private readonly keyUpListener = (event: KeyboardEvent): void => {
    this.keyboardController.handleKeyUp(event);
  };

  /** 캔버스 조작 뒤 키보드 입력이 편집기로 돌아오게 포인터 리스너를 보존한다. */
  private readonly pointerDownListener = (event: PointerEvent): void => {
    this.focusEditor(event.target);
  };

  /** 편집기 루트에만 이벤트를 연결해 같은 페이지의 호스트 단축키를 침범하지 않는다. */
  constructor(
    private readonly element: HTMLDivElement,
    controller: EditorController,
    actions: EditorActions,
    view: EditorViewCommands,
  ) {
    this.keyboardController = new EditorKeyboardController(controller, actions, view);
    this.element.tabIndex = -1;
    this.element.setAttribute("data-designer-keyboard-root", "");
    this.element.addEventListener("keydown", this.keyDownListener);
    this.element.addEventListener("keyup", this.keyUpListener);
    this.element.addEventListener("pointerdown", this.pointerDownListener);
  }

  /** 라우팅 해제 뒤 호스트 화면에 편집기 키 이벤트가 남지 않게 정리한다. */
  destroy(): void {
    this.element.removeEventListener("keydown", this.keyDownListener);
    this.element.removeEventListener("keyup", this.keyUpListener);
    this.element.removeEventListener("pointerdown", this.pointerDownListener);
  }

  /** 버튼과 입력창의 기본 포커스는 보존하고 캔버스 클릭에만 루트 포커스를 준다. */
  private focusEditor(target: EventTarget | null): void {
    if (target instanceof HTMLElement && this.isInteractive(target)) return;
    this.element.focus({ preventScroll: true });
  }

  /** 기본 키 동작을 유지해야 하는 HTML 요소를 명시적으로 구분한다. */
  private isInteractive(target: HTMLElement): boolean {
    return target.closest("button, input, textarea, select, [contenteditable='true']") !== null;
  }
}
