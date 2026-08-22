import {
  BoxElement,
  Frame,
  PageSpec,
  Template,
  type Element,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { EditorController } from "../controller/EditorController.js";
import { SelectTool } from "./SelectTool.js";

/** 선택 도구 시나리오가 사용할 요소 배치를 간단히 만든다. */
function createController(...elements: readonly Element[]): EditorController {
  const template = elements.reduce(
    (current, element) => current.addElement(element),
    new Template({
      id: "t", name: "테스트", version: 1, status: "draft",
      page: new PageSpec("A4", "portrait", [0, 0, 0, 0]),
      fonts: ["Pretendard"], elements: [],
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    }),
  );
  const controller = new EditorController(template);
  controller.setTool(new SelectTool());
  return controller;
}

/** 겹치지 않게 떨어뜨려 스냅이 결과를 흐리지 않는 상자를 만든다. */
function box(id: string, frame: Frame, z = 0): Element {
  return new BoxElement(id, frame, z, false);
}

describe("SelectTool", () => {
  it("클릭은 요소를 선택하고 드래그는 이동 명령으로 확정한다", () => {
    const controller = createController(box("a", new Frame(20, 20, 20, 10)));

    controller.pointerDown(25, 25);
    controller.pointerMove(45, 55);
    controller.pointerUp(45, 55);

    expect(controller.getSelectionModel().isSelected("a")).toBe(true);
    expect(controller.getElement("a")?.frame).toEqual(new Frame(40, 50, 20, 10));
  });

  it("이동하지 않은 클릭은 실행 취소 이력을 만들지 않는다", () => {
    const controller = createController(box("a", new Frame(20, 20, 20, 10)));

    controller.pointerDown(25, 25);
    controller.pointerUp(25, 25);

    expect(controller.canUndo()).toBe(false);
  });

  it("Shift 클릭은 선택을 더한다", () => {
    const controller = createController(
      box("a", new Frame(20, 20, 20, 10)),
      box("b", new Frame(80, 80, 20, 10)),
    );

    controller.pointerDown(25, 25);
    controller.pointerUp(25, 25);
    controller.pointerDown(85, 85, { additive: true });
    controller.pointerUp(85, 85, { additive: true });

    expect(controller.getSelectionModel().getSelectedIds()).toEqual(["a", "b"]);
  });

  it("다중 선택 이동은 상대 위치를 유지하고 한 번의 undo로 되돌린다", () => {
    const controller = createController(
      box("a", new Frame(20, 20, 20, 10)),
      box("b", new Frame(60, 20, 20, 10)),
    );
    controller.selectElements(["a", "b"]);

    controller.pointerDown(25, 25);
    controller.pointerMove(55, 25);
    controller.pointerUp(55, 25);

    expect(controller.getElement("a")?.frame.x).toBe(50);
    expect(controller.getElement("b")?.frame.x).toBe(90);

    controller.undo();
    expect(controller.getElement("a")?.frame.x).toBe(20);
    expect(controller.getElement("b")?.frame.x).toBe(60);
  });

  it("단일 선택에서 손잡이를 잡으면 크기를 바꾼다", () => {
    const controller = createController(box("a", new Frame(20, 20, 40, 20)));
    controller.selectElement("a");

    controller.pointerDown(60, 40);
    controller.pointerMove(90, 70);
    controller.pointerUp(90, 70);

    expect(controller.getElement("a")?.frame).toEqual(new Frame(20, 20, 70, 50));
  });

  it("빈 곳 드래그는 범위에 완전히 들어온 요소만 선택한다", () => {
    const controller = createController(
      box("inside", new Frame(20, 20, 20, 10)),
      box("crossing", new Frame(90, 20, 40, 10)),
    );

    controller.pointerDown(10, 10);
    controller.pointerMove(100, 100);
    controller.pointerUp(100, 100);

    expect(controller.getSelectionModel().getSelectedIds()).toEqual(["inside"]);
  });

  it("잠긴 요소는 클릭으로 선택되지도 움직이지도 않는다", () => {
    const locked = box("locked", new Frame(20, 20, 20, 10)).withLocked(true);
    const controller = createController(locked);

    controller.pointerDown(25, 25);
    controller.pointerMove(60, 60);
    controller.pointerUp(60, 60);

    expect(controller.getSelectionModel().count()).toBe(0);
    expect(controller.getElement("locked")?.frame).toEqual(new Frame(20, 20, 20, 10));
  });

  it("드래그 중에는 템플릿을 바꾸지 않고 미리보기만 갱신한다", () => {
    const controller = createController(box("a", new Frame(20, 20, 20, 10)));

    controller.pointerDown(25, 25);
    controller.pointerMove(55, 55);

    expect(controller.getElement("a")?.frame).toEqual(new Frame(20, 20, 20, 10));
    expect(controller.getPreview().frameFor("a")).toBeDefined();
    expect(controller.canUndo()).toBe(false);
  });

  it("드래그를 확정하면 미리보기 상태가 남지 않는다", () => {
    const controller = createController(box("a", new Frame(20, 20, 20, 10)));

    controller.pointerDown(25, 25);
    controller.pointerMove(55, 55);
    controller.pointerUp(55, 55);

    expect(controller.getPreview().hasFrames()).toBe(false);
    expect(controller.getPreview().getLines()).toEqual([]);
  });
});
