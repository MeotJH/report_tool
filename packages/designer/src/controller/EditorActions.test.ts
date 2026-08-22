import {
  BoxElement,
  Frame,
  PageSpec,
  Template,
  TextElement,
  TextStyle,
  type Element,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { EditorActions } from "./EditorActions.js";
import { EditorController } from "./EditorController.js";

/** 행동 테스트가 사용할 편집 세션을 만든다. */
function createEditor(...elements: readonly Element[]) {
  const template = elements.reduce(
    (current, element) => current.addElement(element),
    new Template({
      id: "t", name: "테스트", version: 1, status: "draft",
      page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
      fonts: ["Pretendard"], elements: [],
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    }),
  );
  const controller = new EditorController(template);
  return { controller, actions: new EditorActions(controller) };
}

/** 배치만 다른 단순 상자를 만든다. */
function box(id: string, frame: Frame, z = 0): Element {
  return new BoxElement(id, frame, z, false, { fill: "#ffffff" });
}

describe("EditorActions", () => {
  it("다중 선택 삭제를 한 번의 실행 취소로 복원한다", () => {
    const { controller, actions } = createEditor(
      box("a", new Frame(10, 10, 10, 10)),
      box("b", new Frame(40, 10, 10, 10)),
    );
    controller.selectElements(["a", "b"]);

    actions.deleteSelection();
    expect(controller.getTemplate().getElements()).toHaveLength(0);

    controller.undo();
    expect(controller.getTemplate().getElements()).toHaveLength(2);
  });

  it("복제는 원본 속성을 유지하고 새 식별자로 살짝 밀어 놓는다", () => {
    const { controller, actions } = createEditor(box("a", new Frame(10, 10, 20, 10)));
    controller.selectElement("a");

    actions.duplicateSelection();

    const clone = controller.getTemplate().getElements()
      .find((element) => element.id !== "a");
    expect(clone).toBeInstanceOf(BoxElement);
    expect(clone?.frame).toEqual(new Frame(14, 14, 20, 10));
    expect((clone as BoxElement).fill).toBe("#ffffff");
  });

  it("연속 붙여넣기는 같은 자리에 겹쳐 쌓이지 않는다", () => {
    const { controller, actions } = createEditor(box("a", new Frame(10, 10, 20, 10)));
    controller.selectElement("a");

    actions.copySelection();
    actions.paste();
    actions.paste();

    const positions = controller.getTemplate().getElements().map((element) => element.frame.x);
    expect(new Set(positions).size).toBe(3);
  });

  it("잠긴 요소는 방향키 이동 대상에서 제외한다", () => {
    const locked = box("locked", new Frame(10, 10, 10, 10)).withLocked(true);
    const { controller, actions } = createEditor(locked, box("free", new Frame(40, 10, 10, 10)));
    controller.selectElements(["locked", "free"]);

    actions.nudgeSelection(5, 0);

    expect(controller.getElement("locked")?.frame.x).toBe(10);
    expect(controller.getElement("free")?.frame.x).toBe(45);
  });

  it("잠금과 숨김 토글이 다른 속성을 건드리지 않는다", () => {
    const { controller, actions } = createEditor(box("a", new Frame(10, 10, 10, 10)));

    actions.toggleLocked(controller.getElement("a")!);
    actions.toggleHidden(controller.getElement("a")!);

    const element = controller.getElement("a")!;
    expect(element.locked).toBe(true);
    expect(element.hidden).toBe(true);
    expect((element as BoxElement).fill).toBe("#ffffff");
  });

  it("순서 변경은 선택 요소를 맨 앞으로 올린다", () => {
    const { controller, actions } = createEditor(
      box("a", new Frame(10, 10, 10, 10), 0),
      box("b", new Frame(40, 10, 10, 10), 1),
    );
    controller.selectElement("a");

    actions.bringToFront();

    expect(controller.getElement("a")!.z).toBeGreaterThan(controller.getElement("b")!.z);
  });

  it("하나만 선택한 정렬은 페이지 배치 영역을 기준으로 삼는다", () => {
    const { controller, actions } = createEditor(box("a", new Frame(50, 50, 20, 10)));
    controller.selectElement("a");

    actions.align("left");

    expect(controller.getElement("a")?.frame.x).toBe(10);
  });

  it("여럿을 선택한 정렬은 한 번의 실행 취소로 복원된다", () => {
    const { controller, actions } = createEditor(
      box("a", new Frame(10, 10, 20, 10)),
      box("b", new Frame(60, 40, 20, 10)),
    );
    controller.selectElements(["a", "b"]);

    actions.align("left");
    controller.undo();

    expect(controller.getElement("a")?.frame.x).toBe(10);
    expect(controller.getElement("b")?.frame.x).toBe(60);
  });

  it("전체 선택은 잠기거나 숨겨진 요소를 제외한다", () => {
    const { controller, actions } = createEditor(
      box("plain", new Frame(10, 10, 10, 10)),
      box("locked", new Frame(40, 10, 10, 10)).withLocked(true),
      box("hidden", new Frame(70, 10, 10, 10)).withHidden(true),
    );

    actions.selectAll();

    expect(controller.getSelectionModel().getSelectedIds()).toEqual(["plain"]);
  });

  it("페이지 변경도 실행 취소 이력에 남는다", () => {
    const { controller, actions } = createEditor();

    actions.changePage(controller.getTemplate().page.withOrientation("landscape"));
    expect(controller.getTemplate().page.widthMm()).toBe(297);

    controller.undo();
    expect(controller.getTemplate().page.widthMm()).toBe(210);
  });

  it("텍스트 속성 변경은 배치와 잠금 상태를 유지한다", () => {
    const text = new TextElement(
      "t", new Frame(10, 20, 30, 8), 3, true,
      { kind: "literal", value: "제목" }, new TextStyle("Pretendard", 10),
    );
    const { controller, actions } = createEditor(text);

    actions.changeElement(text, text.withStyle(text.style.with({ size: 18 })));

    const changed = controller.getElement("t") as TextElement;
    expect(changed.style.size).toBe(18);
    expect(changed.frame).toEqual(new Frame(10, 20, 30, 8));
    expect(changed.locked).toBe(true);
    expect(changed.z).toBe(3);
  });
});
