import {
  Binding,
  FieldElement,
  Frame,
  PageSpec,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { AddElementCommand } from "./AddElementCommand.js";
import { BindFieldCommand } from "./BindFieldCommand.js";
import { CommandStack } from "./CommandStack.js";
import { RemoveElementCommand } from "./RemoveElementCommand.js";
import { RenameTemplateCommand } from "./RenameTemplateCommand.js";
import { TransformElementCommand } from "./TransformElementCommand.js";

describe("Designer commands", () => {
  it("추가 명령을 실행·취소·재실행한다", () => {
    const original = createTemplate();
    const command = new AddElementCommand(createText("text"));
    const stack = new CommandStack();

    const added = stack.execute(command, original);
    const undone = stack.undo(added);
    const redone = stack.redo(undone ?? added);

    expect(added.getElements().map((element) => element.id)).toEqual(["text"]);
    expect(undone?.getElements()).toEqual([]);
    expect(redone?.getElements().map((element) => element.id)).toEqual(["text"]);
  });

  it("새 명령을 실행하면 redo 이력을 버린다", () => {
    const stack = new CommandStack();
    const first = stack.execute(new AddElementCommand(createText("first")), createTemplate());
    const original = stack.undo(first);

    stack.execute(new AddElementCommand(createText("second")), original ?? first);

    expect(stack.canRedo()).toBe(false);
  });

  it("삭제 명령이 제거한 원본 요소를 복원한다", () => {
    const original = createTemplate().addElement(createText("text"));
    const command = new RemoveElementCommand("text");

    const removed = command.execute(original);
    const restored = command.undo(removed);

    expect(removed.getElements()).toEqual([]);
    expect(restored.getElements()[0]).toBe(original.getElements()[0]);
  });

  it("변형 명령이 요소 위치를 왕복한다", () => {
    const before = new Frame(0, 0, 10, 10);
    const after = new Frame(20, 30, 10, 10);
    const original = createTemplate().addElement(createText("text", before));
    const command = new TransformElementCommand("text", before, after);

    const moved = command.execute(original);
    const restored = command.undo(moved);

    expect(moved.getElements()[0]?.frame.equals(after)).toBe(true);
    expect(restored.getElements()[0]?.frame.equals(before)).toBe(true);
  });

  it("필드 바인딩을 변경하고 원래 경로로 되돌린다", () => {
    const before = new Binding("employee.name");
    const after = new Binding("employee.number");
    const field = new FieldElement(
      "field", new Frame(0, 0, 20, 5), 0, false, before, createStyle(),
    );
    const original = createTemplate().addElement(field);
    const command = new BindFieldCommand("field", before, after);

    const changed = command.execute(original);
    const restored = command.undo(changed);

    expect((changed.getElements()[0] as FieldElement).binding.path.toString())
      .toBe("employee.number");
    expect((restored.getElements()[0] as FieldElement).binding.path.toString())
      .toBe("employee.name");
  });

  it("이름 변경 명령이 이전 이름으로 되돌아간다", () => {
    const command = new RenameTemplateCommand("테스트", "7월 서비스 리포트");

    const renamed = command.execute(createTemplate());
    const restored = command.undo(renamed);

    expect(renamed.name).toBe("7월 서비스 리포트");
    expect(restored.name).toBe("테스트");
  });

  it("이력을 비우면 앞 문서의 실행 취소가 남지 않는다", () => {
    const stack = new CommandStack();
    const added = stack.execute(new AddElementCommand(createText("text")), createTemplate());
    stack.undo(added);

    stack.clear();

    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });

  it("일반 텍스트에는 바인딩을 적용하지 않는다", () => {
    const template = createTemplate().addElement(createText("text"));
    const command = new BindFieldCommand(
      "text", new Binding("before"), new Binding("after"),
    );

    expect(() => command.execute(template))
      .toThrow("FieldElement가 아닌 요소에는 바인딩을 걸 수 없다");
  });
});

/** 명령 테스트가 편집 가능한 최소 템플릿에서 시작하도록 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "template",
    name: "테스트",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [0, 0, 0, 0]),
    fonts: ["Pretendard"],
    elements: [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}

/** 테스트 명령이 배치 상태를 비교할 간단한 텍스트 요소를 만든다. */
function createText(id: string, frame = new Frame(0, 0, 10, 10)): TextElement {
  return new TextElement(id, frame, 0, false, { kind: "literal", value: id }, createStyle());
}

/** 테스트 요소가 공통으로 사용할 최소 텍스트 스타일을 만든다. */
function createStyle(): TextStyle {
  return new TextStyle("Pretendard", 10);
}
