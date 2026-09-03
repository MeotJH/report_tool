import { PageSpec, Template, type TemplateLibrary, type TemplateSummary } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { RenameTemplateCommand } from "../command/RenameTemplateCommand.js";
import { EditorController } from "./EditorController.js";
import { TemplateFiling } from "./TemplateFiling.js";

describe("TemplateFiling", () => {
  it("처음에는 저장할 것이 없는 상태로 시작한다", () => {
    const { filing } = createFiling();

    expect(filing.state().label()).toBe("저장됨");
  });

  it("문서를 고치면 저장되지 않은 변경이 있다고 알린다", () => {
    const { controller, filing } = createFiling();

    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));

    expect(filing.state().label()).toBe("저장 안 됨");
  });

  it("저장하면 지금 문서를 보관소에 넣는다", async () => {
    const { controller, filing, library } = createFiling();
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));

    await filing.save();

    expect(library.saved.map((template) => template.name)).toEqual(["8월 리포트"]);
  });

  it("저장을 마치면 다시 저장된 상태가 된다", async () => {
    const { controller, filing } = createFiling();
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));

    await filing.save();

    expect(filing.state().label()).toBe("저장됨");
  });

  it("보관소를 주지 않은 호스트에서는 저장 기능을 쓸 수 없다", () => {
    const controller = new EditorController(createTemplate());

    expect(new TemplateFiling(controller, null).isAvailable()).toBe(false);
  });

  it("저장 상태가 바뀌면 구독자에게 알린다", async () => {
    const { controller, filing } = createFiling();
    let calls = 0;
    filing.subscribe(() => { calls += 1; });
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));

    await filing.save();

    expect(calls).toBeGreaterThan(0);
  });

  it("저장에 실패하면 이유를 그대로 보여 준다", async () => {
    const { controller, filing, library } = createFiling();
    library.failWith = new Error("보관소에 연결할 수 없다");
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));

    await filing.save();

    expect(filing.state().label()).toBe("저장 실패: 보관소에 연결할 수 없다");
  });

  it("저장에 실패하면 다시 눌러 볼 수 있다", async () => {
    const { controller, filing, library } = createFiling();
    library.failWith = new Error("연결 끊김");
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));

    await filing.save();

    expect(filing.state().canSave()).toBe(true);
  });

  it("저장하는 동안 고친 것은 저장된 것으로 치지 않는다", async () => {
    const { controller, filing, library } = createFiling();
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));
    library.holdNextSave();
    const saving = filing.save();
    controller.execute(new RenameTemplateCommand("8월 리포트", "9월 리포트"));
    library.releaseHeldSave();
    await saving;

    expect(filing.state().label()).toBe("저장 안 됨");
  });

  it("저장이 끝나기 전에는 다시 저장하지 않는다", async () => {
    const { controller, filing, library } = createFiling();
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));
    library.holdNextSave();
    const first = filing.save();
    await filing.save();
    library.releaseHeldSave();
    await first;

    expect(library.saved).toHaveLength(1);
  });

  it("한 번도 저장하지 않았으면 저장한 적 없다고 답한다", () => {
    const { filing } = createFiling();

    expect(filing.hasEverSaved()).toBe(false);
  });

  it("한 번 저장하고 나면 저장한 적 있다고 답한다", async () => {
    const { controller, filing } = createFiling();
    controller.execute(new RenameTemplateCommand("테스트", "8월 리포트"));

    await filing.save();

    expect(filing.hasEverSaved()).toBe(true);
  });

  it("보관소에 있는 문서를 목록으로 보여 준다", async () => {
    const { filing, library } = createFiling();
    await library.save(createTemplate().rename("7월 리포트"));

    const listed = await filing.list();

    expect(listed.map((one) => one.name)).toEqual(["7월 리포트"]);
  });

  it("문서를 열면 그것을 편집 대상으로 삼는다", async () => {
    const { controller, filing, library } = createFiling();
    await library.save(createTemplate().rename("7월 리포트"));

    await filing.open("template");

    expect(controller.getTemplate().name).toBe("7월 리포트");
  });

  it("문서를 열면 꺼낸 그대로가 저장된 상태다", async () => {
    const { filing, library } = createFiling();
    await library.save(createTemplate().rename("7월 리포트"));

    await filing.open("template");

    expect(filing.state().label()).toBe("저장됨");
  });

  it("열지 못하면 이유를 보여 주고 지금 문서를 그대로 둔다", async () => {
    const { controller, filing } = createFiling();

    await filing.open("없는문서");

    expect(filing.state().label()).toBe("저장 실패: 보관소에 없는문서가 없다");
    expect(controller.getTemplate().name).toBe("테스트");
  });
});

/** 호스트가 주는 보관소 자리에 들어가는, 메모리에만 담는 구현이다. */
class FakeTemplateLibrary implements TemplateLibrary {
  readonly saved: Template[] = [];

  /** 넣으려 할 때 던질 오류다. 실패한 저장을 재현한다. */
  failWith: Error | null = null;

  /** 저장을 끝내지 않고 붙잡아 두는 열쇠다. 저장 중 상태를 재현한다. */
  private release: (() => void) | null = null;

  /** 무엇을 몇 번 넣었는지 테스트가 그대로 확인하게 한다. */
  async save(template: Template): Promise<void> {
    if (this.failWith !== null) throw this.failWith;
    const held = this.release;
    if (held !== null) await new Promise<void>((resolve) => { this.release = resolve; });
    this.saved.push(template);
  }

  /** 다음 저장을 놓아 줄 때까지 끝내지 않게 한다. */
  holdNextSave(): void {
    this.release = () => undefined;
  }

  /** 붙잡아 둔 저장을 끝내게 한다. */
  releaseHeldSave(): void {
    const release = this.release;
    this.release = null;
    release?.();
  }

  /** 넣어 둔 것을 목록으로 돌려준다. */
  async list(): Promise<readonly TemplateSummary[]> {
    return this.saved.map((template) => ({
      id: template.id,
      name: template.name,
      updatedAt: template.updatedAt,
    }));
  }

  /** 식별자가 같은 마지막 문서를 돌려준다. */
  async load(id: string): Promise<Template> {
    const found = [...this.saved].reverse().find((template) => template.id === id);
    if (found === undefined) throw new Error(`보관소에 ${id}가 없다`);
    return found;
  }
}

/** 편집 세션과 보관소를 이어 둔 기본 상태를 만든다. */
function createFiling(): {
  controller: EditorController;
  filing: TemplateFiling;
  library: FakeTemplateLibrary;
} {
  const controller = new EditorController(createTemplate());
  const library = new FakeTemplateLibrary();
  return { controller, library, filing: new TemplateFiling(controller, library) };
}

/** 저장 테스트가 사용할 빈 초안 템플릿을 만든다. */
function createTemplate(): Template {
  return new Template({
    id: "template", name: "테스트", version: 1, status: "draft",
    page: new PageSpec("A4", "portrait", [0, 0, 0, 0]),
    fonts: ["MalgunGothic"], elements: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
}
