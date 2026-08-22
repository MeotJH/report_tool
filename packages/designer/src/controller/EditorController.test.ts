import { BoxElement, Frame, PageSpec, Template, TextElement, TextStyle, type Element } from "@report-tool/core";
import { describe, expect, it, vi } from "vitest";
import { AddElementCommand } from "../command/AddElementCommand.js";
import { RemoveElementCommand } from "../command/RemoveElementCommand.js";
import { TextTool } from "../tool/TextTool.js";
import { EditorController } from "./EditorController.js";

describe("EditorController", () => {
  it("명령과 undo를 반영할 때마다 구독자에게 알린다", () => {
    const controller = new EditorController(createTemplate());
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.execute(new AddElementCommand(createText("text")));
    controller.undo();

    expect(controller.getTemplate().getElements()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("구독 해제 뒤에는 변경을 알리지 않는다", () => {
    const controller = new EditorController(createTemplate());
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    unsubscribe();
    controller.execute(new AddElementCommand(createText("text")));

    expect(listener).not.toHaveBeenCalled();
  });

  it("현재 도구 종류를 화면의 활성 상태에 제공한다", () => {
    const controller = new EditorController(createTemplate());

    controller.setTool(new TextTool());

    expect(controller.getCurrentToolKind()).toBe("text");
  });

  it("생성 도구가 끝나면 선택 도구로 돌아간다", () => {
    const controller = new EditorController(createTemplate());
    controller.setTool(new TextTool());

    controller.activateSelectTool();

    expect(controller.getCurrentToolKind()).toBe("select");
  });

  it("Shift 선택이 이미 선택된 요소를 선택에서 빼낸다", () => {
    const controller = createControllerWith(createText("a"), createText("b"));

    controller.selectElement("a");
    controller.selectElement("b", true);
    controller.selectElement("a", true);

    expect(controller.getSelectionModel().getSelectedIds()).toEqual(["b"]);
  });

  it("숨긴 요소와 잠긴 요소는 캔버스 클릭으로 잡히지 않는다", () => {
    const controller = createControllerWith(
      createText("visible"),
      createText("hidden").withHidden(true).withZ(5),
      createText("locked").withLocked(true).withZ(9),
    );

    expect(controller.findElementAt(5, 5)?.id).toBe("visible");
  });

  it("영역에 완전히 들어온 요소만 범위 선택 대상으로 본다", () => {
    const controller = createControllerWith(
      new BoxElement("inside", new Frame(10, 10, 10, 10), 0, false),
      new BoxElement("crossing", new Frame(18, 10, 40, 10), 1, false),
    );

    const found = controller.findElementsWithin(new Frame(0, 0, 30, 30));

    expect(found.map((element) => element.id)).toEqual(["inside"]);
  });

  it("삭제로 사라진 요소는 선택 집합에 남지 않는다", () => {
    const controller = createControllerWith(createText("a"));
    controller.selectElement("a");

    controller.execute(new RemoveElementCommand("a"));

    expect(controller.getSelectionModel().count()).toBe(0);
  });

  it("스냅 후보에서 함께 움직이는 요소와 숨긴 요소를 제외한다", () => {
    const controller = createControllerWith(
      createText("moving"),
      createText("other"),
      createText("hidden").withHidden(true),
    );

    expect(controller.getFramesExcept(["moving"])).toHaveLength(1);
  });

  it("호스트가 준 샘플 데이터를 미리보기 렌더에 그대로 제공한다", () => {
    const sample = { employee: { name: "홍길동" } };

    const controller = new EditorController(createTemplate(), sample);

    expect(controller.getSampleData()).toBe(sample);
    expect(controller.getMode()).toBe("design");
  });
});

/** 컨트롤러 테스트가 사용할 빈 초안 템플릿을 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "template", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [0, 0, 0, 0]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 요소가 미리 배치된 편집 세션을 간단히 만든다. */
function createControllerWith(...elements: readonly Element[]): EditorController {
  const template = elements.reduce(
    (current, element) => current.addElement(element),
    createTemplate(),
  );
  return new EditorController(template);
}

/** 컨트롤러가 실행할 추가 명령의 대상 요소를 만든다. */
function createText(id: string): TextElement {
  return new TextElement(
    id, new Frame(0, 0, 10, 10), 0, false,
    { kind: "literal", value: "텍스트" }, new TextStyle("Pretendard", 10),
  );
}
