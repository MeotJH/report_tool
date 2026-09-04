import {
  BoxElement, Frame, PageSpec, Template, TemplateVariable, TextElement, TextStyle,
  type Element,
} from "@report-tool/core";
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

  it("새 요소는 지금 보고 있는 쪽에 놓인다", () => {
    const controller = new EditorController(createTemplate());
    controller.setActivePageIndex(1);

    controller.placeNewElement(createText("text"));

    expect(controller.getTemplate().getElements()[0]?.pageIndex).toBe(1);
  });

  it("보고 있는 쪽의 요소만 고를 수 있다", () => {
    const controller = new EditorController(createTemplate());
    controller.placeNewElement(createText("first"));
    controller.setActivePageIndex(1);
    controller.placeNewElement(createText("second"));

    expect(controller.elementsOnActivePage().map((element) => element.id)).toEqual(["second"]);
    expect(controller.findElementAt(5, 5)?.id).toBe("second");
  });

  it("쪽을 옮기면 다른 쪽 요소의 선택이 남지 않는다", () => {
    const controller = new EditorController(createTemplate());
    controller.placeNewElement(createText("first"));

    controller.setActivePageIndex(1);

    expect(controller.getSelectionModel().count()).toBe(0);
  });

  it("마지막 쪽 뒤로 한 장까지 갈 수 있고 그 이상은 가지 않는다", () => {
    const controller = new EditorController(createTemplate());
    controller.placeNewElement(createText("first"));

    controller.setActivePageIndex(9);

    expect(controller.getActivePageIndex()).toBe(1);
    expect(controller.pageCount()).toBe(2);
  });

  it("빈 쪽은 요소를 놓기 전까지 문서에 남지 않는다", () => {
    const controller = new EditorController(createTemplate());
    controller.placeNewElement(createText("first"));
    controller.setActivePageIndex(1);

    expect(controller.getTemplate().pageCount()).toBe(1);

    controller.placeNewElement(createText("second"));

    expect(controller.getTemplate().pageCount()).toBe(2);
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

  it("호스트가 준 샘플 데이터를 값 그대로 미리보기 렌더에 제공한다", () => {
    // 같은 객체를 돌려주지는 않는다. 선언의 예시를 얹어야 하므로 사본을 만든다.
    // 대신 호스트가 준 것을 고치지 않는다 — 호스트의 자료는 우리 것이 아니다.
    const sample = { employee: { name: "홍길동" } };

    const controller = new EditorController(createTemplate(), sample);

    expect(controller.getSampleData()).toEqual({ employee: { name: "홍길동" } });
    expect(sample).toEqual({ employee: { name: "홍길동" } });
    expect(controller.getMode()).toBe("design");
  });
});

describe("EditorController 미리보기 자료", () => {
  it("선언에 적어 둔 예시로 빈 자리를 채운다", () => {
    // 방금 선언한 변수를 놓으면 미리보기가 빈칸이 된다. 그러면 넘침도 크기도
    // 확인할 수 없어 편집기를 보면서 양식을 맞출 수가 없다.
    const controller = new EditorController(
      createTemplate().withVariables([
        new TemplateVariable("pay.bonus", "상여금", "currency", false, { sample: "1500000" }),
      ]),
      { employee: { name: "홍길동" } },
    );

    expect(controller.getSampleData()).toEqual({
      employee: { name: "홍길동" },
      pay: { bonus: "1500000" },
    });
  });

  it("호스트가 준 값을 예시가 덮지 않는다", () => {
    const controller = new EditorController(
      createTemplate().withVariables([
        new TemplateVariable("employee.name", "성명", "string", false, { sample: "예시이름" }),
      ]),
      { employee: { name: "홍길동" } },
    );

    expect(controller.getSampleData()).toEqual({ employee: { name: "홍길동" } });
  });

  it("선언이 바뀌면 미리보기 자료도 따라 바뀐다", () => {
    const controller = new EditorController(createTemplate(), {});
    const before = controller.getSampleData();

    controller.openTemplate(controller.getTemplate().withVariables([
      new TemplateVariable("pay.bonus", "상여금", "currency", false, { sample: "1500000" }),
    ]));

    expect(before).toEqual({});
    expect(controller.getSampleData()).toEqual({ pay: { bonus: "1500000" } });
  });
});

describe("EditorController.openTemplate", () => {
  it("연 문서를 지금 편집 대상으로 삼는다", () => {
    const controller = new EditorController(createTemplate());

    controller.openTemplate(createTemplate().rename("8월 리포트"));

    expect(controller.getTemplate().name).toBe("8월 리포트");
  });

  it("앞 문서의 실행 취소 이력을 가져오지 않는다", () => {
    const controller = new EditorController(createTemplate());
    controller.execute(new AddElementCommand(createText("text")));

    controller.openTemplate(createTemplate());

    expect(controller.canUndo()).toBe(false);
  });

  it("앞 문서에서 보던 쪽과 고른 요소를 남기지 않는다", () => {
    const controller = createControllerWith(createText("text"));
    controller.selectElement("text");
    controller.setActivePageIndex(2);

    controller.openTemplate(createTemplate());

    expect(controller.getSelectionModel().count()).toBe(0);
    expect(controller.getActivePageIndex()).toBe(0);
  });

  it("문서를 열면 구독자에게 알린다", () => {
    const controller = new EditorController(createTemplate());
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.openTemplate(createTemplate());

    expect(listener).toHaveBeenCalledTimes(1);
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
