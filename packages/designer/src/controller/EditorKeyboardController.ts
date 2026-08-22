import type { EditorActions } from "./EditorActions.js";
import type { EditorController } from "./EditorController.js";
import { ImageTool } from "../tool/ImageTool.js";
import { SelectTool } from "../tool/SelectTool.js";
import { ShapeTool } from "../tool/ShapeTool.js";
import { SignatureTool } from "../tool/SignatureTool.js";
import { TableTool } from "../tool/TableTool.js";
import { TextTool } from "../tool/TextTool.js";
import type { EditorTool } from "../tool/EditorTool.js";

/** 키보드가 캔버스에만 요청할 수 있는 보기 동작을 좁게 제한한다. */
export interface EditorViewCommands {
  /** 문서 전체가 보이도록 확대율을 맞춘다. */
  fitToViewport(): void;

  /** Space를 누르고 있는 동안 드래그를 화면 이동으로 바꾼다. */
  setSpacePanning(active: boolean): void;
}

/** 단축키 하나가 다루는 입력과 동작을 함께 전달한다. */
interface ShortcutContext {
  readonly event: KeyboardEvent;
  readonly controller: EditorController;
  readonly actions: EditorActions;
  readonly view: EditorViewCommands;
}

/** 서로 다른 단축키 동작을 조건문 나열 없이 교체 가능한 전략으로 제한한다. */
abstract class EditorShortcut {
  /** 현재 키 입력을 이 전략이 처리해야 하는지 판단한다. */
  abstract matches(event: KeyboardEvent): boolean;

  /** 일치한 키 입력을 편집기 동작으로 바꾸고 실제 처리 여부를 반환한다. */
  abstract run(context: ShortcutContext): boolean;

  /** 보조키 조합을 판정하는 규칙을 모든 전략이 공유하게 한다. */
  protected hasCommand(event: KeyboardEvent): boolean {
    return event.metaKey || event.ctrlKey;
  }
}

/** 운영체제별 보조키 차이를 숨기고 동일한 undo/redo 경험을 제공한다. */
class HistoryShortcut extends EditorShortcut {
  /** Cmd/Ctrl+Z와 Windows 관례인 Ctrl+Y만 명령 이력 입력으로 받는다. */
  matches(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    return this.hasCommand(event) && (key === "z" || key === "y");
  }

  /** Shift+Z 또는 Y는 redo로, 나머지 Z는 undo로 해석한다. */
  run({ event, controller }: ShortcutContext): boolean {
    if (event.shiftKey || event.key.toLowerCase() === "y") controller.redo();
    else controller.undo();
    return true;
  }
}

/** 선택된 요소 삭제가 툴바와 같은 Command 이력을 사용하게 한다. */
class DeleteShortcut extends EditorShortcut {
  /** 텍스트 입력이 아닌 편집 화면의 두 삭제 키를 동일하게 취급한다. */
  matches(event: KeyboardEvent): boolean {
    return event.key === "Delete" || event.key === "Backspace";
  }

  /** 선택 요소 전체를 한 번의 실행 취소로 복원 가능하게 삭제한다. */
  run({ controller, actions }: ShortcutContext): boolean {
    if (controller.getSelectionModel().count() === 0) return false;
    actions.deleteSelection();
    return true;
  }
}

/** 사용자가 언제든 안전한 선택 상태로 돌아갈 수 있는 탈출구를 제공한다. */
class EscapeShortcut extends EditorShortcut {
  /** 브라우저가 표준화한 Escape 키 이름만 취소 입력으로 받는다. */
  matches(event: KeyboardEvent): boolean {
    return event.key === "Escape";
  }

  /** 직접 편집·선택·생성 도구를 함께 해제해 다음 입력의 의미를 예측 가능하게 한다. */
  run({ controller }: ShortcutContext): boolean {
    controller.endTextEdit();
    controller.selectElement(null);
    controller.setTool(new SelectTool());
    return true;
  }
}

/** 마우스 없이도 선택 요소를 mm 단위로 정밀하게 배치할 수 있게 한다. */
class MoveShortcut extends EditorShortcut {
  private static readonly STEP_MM = 1;
  private static readonly LARGE_STEP_MM = 10;
  private readonly directions: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
  };

  /** 방향 벡터가 정의된 네 키만 이동 입력으로 받는다. */
  matches(event: KeyboardEvent): boolean {
    return this.directions[event.key] !== undefined;
  }

  /** 일반 이동은 1mm, Shift 이동은 10mm를 하나의 변형 명령으로 기록한다. */
  run({ event, controller, actions }: ShortcutContext): boolean {
    const direction = this.directions[event.key];
    if (direction === undefined) return false;
    if (controller.getSelectionModel().count() === 0) return false;
    const distance = event.shiftKey ? MoveShortcut.LARGE_STEP_MM : MoveShortcut.STEP_MM;
    actions.nudgeSelection(direction[0] * distance, direction[1] * distance);
    return true;
  }
}

/** 복제·복사·붙여넣기·전체 선택을 같은 보조키 규칙으로 처리한다. */
class ClipboardShortcut extends EditorShortcut {
  private static readonly KEYS: readonly string[] = ["d", "c", "v", "a"];

  /** 보조키와 함께 눌린 네 키만 클립보드 계열 입력으로 받는다. */
  matches(event: KeyboardEvent): boolean {
    return this.hasCommand(event) && ClipboardShortcut.KEYS.includes(event.key.toLowerCase());
  }

  /** 각 키를 대응하는 편집 행동 하나로 연결한다. */
  run({ event, actions }: ShortcutContext): boolean {
    const handlers: Readonly<Record<string, () => void>> = {
      d: () => actions.duplicateSelection(),
      c: () => actions.copySelection(),
      v: () => actions.paste(),
      a: () => actions.selectAll(),
    };
    const handler = handlers[event.key.toLowerCase()];
    if (handler === undefined) return false;
    handler();
    return true;
  }
}

/** 쌓임 순서 변경을 대괄호 관례로 제공한다. */
class OrderShortcut extends EditorShortcut {
  /** 보조키 없이도 동작하도록 대괄호 두 키만 순서 입력으로 받는다. */
  matches(event: KeyboardEvent): boolean {
    return event.key === "[" || event.key === "]";
  }

  /** 보조키를 함께 누르면 맨 앞·맨 뒤로, 아니면 한 칸씩 옮긴다. */
  run({ event, controller, actions }: ShortcutContext): boolean {
    if (controller.getSelectionModel().count() === 0) return false;
    const forward = event.key === "]";
    if (this.hasCommand(event)) {
      if (forward) actions.bringToFront();
      else actions.sendToBack();
      return true;
    }
    if (forward) actions.bringForward();
    else actions.sendBackward();
    return true;
  }
}

/** 확대·축소·실제 크기·화면 맞춤을 문서 변경과 분리해 처리한다. */
class ZoomShortcut extends EditorShortcut {
  private static readonly KEYS: readonly string[] = ["=", "+", "-", "_", "0", "1"];

  /** 보조키와 함께 눌린 확대 관련 키만 받는다. */
  matches(event: KeyboardEvent): boolean {
    return this.hasCommand(event) && ZoomShortcut.KEYS.includes(event.key);
  }

  /** 각 키를 확대율 변경이나 화면 맞춤 하나로 연결한다. */
  run({ event, controller, view }: ShortcutContext): boolean {
    const viewport = controller.getViewport();
    const handlers: Readonly<Record<string, () => void>> = {
      "=": () => viewport.zoomIn(),
      "+": () => viewport.zoomIn(),
      "-": () => viewport.zoomOut(),
      "_": () => viewport.zoomOut(),
      "0": () => viewport.resetZoom(),
      "1": () => view.fitToViewport(),
    };
    const handler = handlers[event.key];
    if (handler === undefined) return false;
    handler();
    controller.notifyPreviewChange();
    return true;
  }
}

/** 도구 전환을 마우스 이동 없이 한 글자로 처리한다. */
class ToolShortcut extends EditorShortcut {
  private readonly tools: Readonly<Record<string, () => EditorTool>> = {
    v: () => new SelectTool(),
    t: () => new TextTool(),
    r: () => new ShapeTool("box"),
    l: () => new ShapeTool("line"),
    b: () => new TableTool(),
    m: () => new ImageTool(),
    s: () => new SignatureTool(),
  };

  /** 보조키 없이 눌린 도구 글자만 받아 저장·검색 단축키와 겹치지 않게 한다. */
  matches(event: KeyboardEvent): boolean {
    if (this.hasCommand(event) || event.altKey) return false;
    return this.tools[event.key.toLowerCase()] !== undefined;
  }

  /** 선택한 도구를 즉시 활성화한다. */
  run({ event, controller }: ShortcutContext): boolean {
    const create = this.tools[event.key.toLowerCase()];
    if (create === undefined) return false;
    controller.setTool(create());
    return true;
  }
}

/**
 * 브라우저 키 입력을 현재 편집기 상태에 맞는 단축키 전략으로 전달한다.
 *
 * 입력창 안에서는 어떤 전략도 실행하지 않는다. 문서 편집 단축키가 글자 입력을
 * 가로채면 사용자는 텍스트를 고칠 수 없게 된다.
 */
export class EditorKeyboardController {
  private readonly shortcuts: readonly EditorShortcut[] = [
    new HistoryShortcut(),
    new ZoomShortcut(),
    new ClipboardShortcut(),
    new DeleteShortcut(),
    new EscapeShortcut(),
    new MoveShortcut(),
    new OrderShortcut(),
    new ToolShortcut(),
  ];

  /** 편집 상태를 직접 소유하지 않고 중앙 컨트롤러의 명령 경로만 사용한다. */
  constructor(
    private readonly controller: EditorController,
    private readonly actions: EditorActions,
    private readonly view: EditorViewCommands,
  ) {}

  /** 단축키 전략이 처리한 경우에만 브라우저 기본 동작을 막는다. */
  handle(event: KeyboardEvent): boolean {
    if (this.isEditableTarget(event.target)) return false;
    if (this.handleSpace(event, true)) return true;
    const shortcut = this.shortcuts.find((candidate) => candidate.matches(event));
    if (shortcut === undefined) return false;
    const handled = shortcut.run({
      event, controller: this.controller, actions: this.actions, view: this.view,
    });
    if (handled) event.preventDefault();
    return handled;
  }

  /** Space를 떼는 순간 화면 이동 모드가 남지 않게 한다. */
  handleKeyUp(event: KeyboardEvent): boolean {
    return this.handleSpace(event, false);
  }

  /** 누름과 뗌이 같은 판정 규칙으로 화면 이동 상태를 바꾸게 한다. */
  private handleSpace(event: KeyboardEvent, active: boolean): boolean {
    if (event.key !== " " && event.code !== "Space") return false;
    event.preventDefault();
    this.view.setSpacePanning(active);
    return true;
  }

  /**
   * 입력창에서 글자를 지우거나 이동할 때 편집기 단축키가 가로채지 않게 한다.
   *
   * instanceof HTMLElement로 판정하지 않는 이유는 Shadow DOM과 iframe에서
   * 실행 컨텍스트가 다르면 같은 종류의 요소도 instanceof가 거짓이 되기 때문이다.
   * 실제로 필요한 것은 태그 이름과 편집 가능 여부뿐이다.
   */
  private isEditableTarget(target: EventTarget | null): boolean {
    if (target === null || typeof target !== "object") return false;
    const element = target as Partial<HTMLElement>;
    if (element.isContentEditable === true) return true;
    if (typeof element.tagName !== "string") return false;
    const tagName = element.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select";
  }
}
