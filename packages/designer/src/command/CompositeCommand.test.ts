import { BoxElement, Frame, PageSpec, Template } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { AddElementCommand } from "./AddElementCommand.js";
import { ChangeElementCommand } from "./ChangeElementCommand.js";
import { ChangePageCommand } from "./ChangePageCommand.js";
import { CompositeCommand } from "./CompositeCommand.js";
import { RemoveElementCommand } from "./RemoveElementCommand.js";

/** 명령 테스트가 사용할 초안 템플릿을 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "t", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: ["Pretendard"], elements: [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 순서 검증에 쓸 단순 상자를 만든다. */
function box(id: string): BoxElement {
  return new BoxElement(id, new Frame(0, 0, 10, 10), 0, false);
}

describe("CompositeCommand", () => {
  it("하위 명령을 등록 순서대로 실행한다", () => {
    const command = new CompositeCommand([
      new AddElementCommand(box("a")),
      new AddElementCommand(box("b")),
    ]);

    const result = command.execute(createTemplate());

    expect(result.getElements().map((element) => element.id)).toEqual(["a", "b"]);
  });

  it("취소는 역순으로 되돌려 중간 상태가 어긋나지 않게 한다", () => {
    const template = createTemplate().addElement(box("a"));
    const command = new CompositeCommand([
      new RemoveElementCommand("a"),
      new AddElementCommand(box("b")),
    ]);

    const executed = command.execute(template);
    const restored = command.undo(executed);

    expect(executed.getElements().map((element) => element.id)).toEqual(["b"]);
    expect(restored.getElements().map((element) => element.id)).toEqual(["a"]);
  });

  it("빈 묶음은 만들 수 없다", () => {
    expect(() => new CompositeCommand([])).toThrow("빈 명령 묶음은 실행할 수 없다");
  });
});

describe("ChangeElementCommand", () => {
  it("요소를 변경 후 인스턴스로 바꾸고 원래대로 되돌린다", () => {
    const before = box("a");
    const after = before.withLocked(true).withHidden(true);
    const template = createTemplate().addElement(before);
    const command = new ChangeElementCommand(before, after);

    const changed = command.execute(template);
    const restored = command.undo(changed);

    expect(changed.getElements()[0]?.locked).toBe(true);
    expect(changed.getElements()[0]?.hidden).toBe(true);
    expect(restored.getElements()[0]?.locked).toBe(false);
  });

  it("서로 다른 요소를 변경 전후로 묶을 수 없다", () => {
    expect(() => new ChangeElementCommand(box("a"), box("b")))
      .toThrow("서로 다른 요소를 변경 전후로 묶을 수 없다");
  });
});

describe("ChangePageCommand", () => {
  it("용지 변경을 실행하고 되돌린다", () => {
    const template = createTemplate();
    const command = new ChangePageCommand(template.page, template.page.withSize("A5"));

    const changed = command.execute(template);
    const restored = command.undo(changed);

    expect(changed.page.widthMm()).toBe(148);
    expect(restored.page.widthMm()).toBe(210);
  });
});
