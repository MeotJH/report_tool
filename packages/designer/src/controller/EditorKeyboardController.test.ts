import { Frame, PageSpec, Template, TextElement, TextStyle } from "@report-tool/core";
import { describe, expect, it, vi } from "vitest";
import { AddElementCommand } from "../command/AddElementCommand.js";
import { TextTool } from "../tool/TextTool.js";
import { EditorActions } from "./EditorActions.js";
import { EditorController } from "./EditorController.js";
import {
  EditorKeyboardController,
  type EditorViewCommands,
} from "./EditorKeyboardController.js";

/** 단축키 테스트가 컨트롤러·행동·보기 명령을 한 번에 준비하게 한다. */
function createEditor(elements: readonly TextElement[] = []) {
  const controller = new EditorController(createTemplate(elements));
  const view: EditorViewCommands = {
    fitToViewport: vi.fn(),
    setSpacePanning: vi.fn(),
  };
  const keyboard = new EditorKeyboardController(
    controller, new EditorActions(controller), view,
  );
  return { controller, keyboard, view };
}

describe("EditorKeyboardController", () => {
  it("Cmd 또는 Ctrl+Z와 Shift 조합으로 명령 이력을 이동한다", () => {
    const { controller, keyboard } = createEditor();
    controller.execute(new AddElementCommand(createText("text")));

    keyboard.handle(createKeyboardEvent("z", { metaKey: true }));
    expect(controller.getTemplate().getElements()).toHaveLength(0);

    keyboard.handle(createKeyboardEvent("z", { metaKey: true, shiftKey: true }));
    expect(controller.getTemplate().getElements()).toHaveLength(1);
  });

  it("Delete로 현재 선택 요소를 삭제한다", () => {
    const { controller, keyboard } = createEditor([createText("first")]);
    controller.selectElement("first");

    const event = createKeyboardEvent("Delete");
    keyboard.handle(event);

    expect(controller.getTemplate().getElements()).toHaveLength(0);
    expect(controller.getSelectionModel().getSelectedIds()).toEqual([]);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("Escape로 선택과 생성 도구를 함께 해제한다", () => {
    const { controller, keyboard } = createEditor([createText("text")]);
    controller.selectElement("text");
    controller.setTool(new TextTool());

    keyboard.handle(createKeyboardEvent("Escape"));

    expect(controller.getSelectionModel().getSelectedIds()).toEqual([]);
    expect(controller.getCurrentToolKind()).toBe("select");
  });

  it("방향키는 1mm, Shift 방향키는 10mm 이동하고 undo할 수 있다", () => {
    const { controller, keyboard } = createEditor([
      createText("text", new Frame(20, 30, 40, 10)),
    ]);
    controller.selectElement("text");

    keyboard.handle(createKeyboardEvent("ArrowRight"));
    keyboard.handle(createKeyboardEvent("ArrowDown", { shiftKey: true }));

    expect(frameOf(controller, "text")).toEqual(new Frame(21, 40, 40, 10));
    controller.undo();
    expect(frameOf(controller, "text")).toEqual(new Frame(21, 30, 40, 10));
  });

  it("다중 선택 방향키 이동을 한 번의 undo로 되돌린다", () => {
    const { controller, keyboard } = createEditor([
      createText("a", new Frame(10, 10, 20, 8)),
      createText("b", new Frame(50, 10, 20, 8)),
    ]);
    controller.selectElements(["a", "b"]);

    keyboard.handle(createKeyboardEvent("ArrowRight"));
    controller.undo();

    expect(frameOf(controller, "a")).toEqual(new Frame(10, 10, 20, 8));
    expect(frameOf(controller, "b")).toEqual(new Frame(50, 10, 20, 8));
  });

  it("Cmd+D는 선택 요소를 복제하고 사본을 선택한다", () => {
    const { controller, keyboard } = createEditor([createText("origin")]);
    controller.selectElement("origin");

    keyboard.handle(createKeyboardEvent("d", { metaKey: true }));

    expect(controller.getTemplate().getElements()).toHaveLength(2);
    expect(controller.getSelectionModel().getSelectedIds()).not.toEqual(["origin"]);
  });

  it("Cmd+C와 Cmd+V로 복사한 요소를 새 식별자로 붙여넣는다", () => {
    const { controller, keyboard } = createEditor([createText("origin")]);
    controller.selectElement("origin");

    keyboard.handle(createKeyboardEvent("c", { metaKey: true }));
    keyboard.handle(createKeyboardEvent("v", { metaKey: true }));

    const ids = controller.getTemplate().getElements().map((element) => element.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("Cmd+A는 잠기거나 숨겨지지 않은 요소만 선택한다", () => {
    const { controller, keyboard } = createEditor([
      createText("plain"),
      createText("locked"),
    ]);
    const locked = controller.getElement("locked")!;
    controller.execute({
      execute: (template) => template.replaceElement("locked", () => locked.withLocked(true)),
      undo: (template) => template,
    });

    keyboard.handle(createKeyboardEvent("a", { metaKey: true }));

    expect(controller.getSelectionModel().getSelectedIds()).toEqual(["plain"]);
  });

  it("대괄호로 쌓임 순서를 바꾼다", () => {
    const { controller, keyboard } = createEditor([
      createText("bottom"), createText("top"),
    ]);
    controller.selectElement("bottom");

    keyboard.handle(createKeyboardEvent("]", { metaKey: true }));

    const top = [...controller.getTemplate().getElements()]
      .sort((first, second) => second.z - first.z)[0];
    expect(top?.id).toBe("bottom");
  });

  it("확대 단축키는 문서를 바꾸지 않고 보기 상태만 바꾼다", () => {
    const { controller, keyboard, view } = createEditor([createText("text")]);

    keyboard.handle(createKeyboardEvent("=", { metaKey: true }));
    expect(controller.getViewport().getZoomPercent()).toBe(125);

    keyboard.handle(createKeyboardEvent("0", { metaKey: true }));
    expect(controller.getViewport().getZoomPercent()).toBe(100);

    keyboard.handle(createKeyboardEvent("1", { metaKey: true }));
    expect(view.fitToViewport).toHaveBeenCalledOnce();
    expect(controller.canUndo()).toBe(false);
  });

  it("도구 단축키로 생성 도구를 전환한다", () => {
    const { controller, keyboard } = createEditor();

    keyboard.handle(createKeyboardEvent("t"));
    expect(controller.getCurrentToolKind()).toBe("text");

    keyboard.handle(createKeyboardEvent("m"));
    expect(controller.getCurrentToolKind()).toBe("image");
  });

  it("Space를 누르는 동안만 화면 이동 모드를 켠다", () => {
    const { keyboard, view } = createEditor();

    keyboard.handle(createKeyboardEvent(" "));
    keyboard.handleKeyUp(createKeyboardEvent(" "));

    expect(view.setSpacePanning).toHaveBeenNthCalledWith(1, true);
    expect(view.setSpacePanning).toHaveBeenNthCalledWith(2, false);
  });

  it("입력창 안에서는 편집기 단축키가 동작하지 않는다", () => {
    const { controller, keyboard } = createEditor([createText("text")]);
    controller.selectElement("text");

    const handled = keyboard.handle({
      ...createKeyboardEvent("Delete"),
      target: createInputTarget(),
    } as unknown as KeyboardEvent);

    expect(handled).toBe(false);
    expect(controller.getTemplate().getElements()).toHaveLength(1);
  });
});

/** 단축키 테스트가 브라우저 구현과 무관하게 필요한 키 상태만 표현하게 한다. */
function createKeyboardEvent(
  key: string,
  options: Readonly<{ metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }> = {},
): KeyboardEvent {
  return {
    key,
    code: key === " " ? "Space" : "",
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: false,
    target: null,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

/** 입력창 판정이 실제 DOM 없이도 검증되게 최소 형태만 흉내낸다. */
function createInputTarget(): EventTarget {
  return { tagName: "INPUT", isContentEditable: false } as unknown as EventTarget;
}

/** 테스트마다 외부 상태가 없는 편집 가능한 템플릿을 만든다. */
function createTemplate(elements: readonly TextElement[]): Template {
  return new Template({
    id: "template", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 이동과 삭제 결과를 식별할 수 있는 고정 문구 요소를 만든다. */
function createText(id: string, frame = new Frame(10, 10, 30, 8)): TextElement {
  return new TextElement(
    id, frame, 0, false,
    { kind: "literal", value: id }, new TextStyle("Pretendard", 10),
  );
}

/** 특정 요소의 현재 위치를 중복 탐색 없이 검증할 수 있게 반환한다. */
function frameOf(controller: EditorController, elementId: string): Frame | undefined {
  return controller.getElement(elementId)?.frame;
}
