import type { Template, TemplateLibrary, TemplateSummary } from "@report-tool/core";
import type { EditorController } from "./EditorController.js";
import { SaveState } from "./SaveState.js";

/**
 * 편집 중인 문서를 보관소에 넣고 다시 꺼내는 절차를 한곳에 둔다.
 *
 * 지금까지 편집기는 만든 것을 어디에도 남기지 못했다. 호스트가
 * `getTemplate().toJSON()`을 가져갈 수는 있었지만, 그것을 **언제** 가져가야
 * 하는지는 아무도 몰랐다. 그래서 창을 한 번 닫으면 하루가 사라졌다.
 *
 * 저장 여부는 **템플릿 객체가 같은 것인지**로 판단한다. 템플릿은 불변이라 한
 * 글자만 고쳐도 다른 객체가 되기 때문이다. 되돌리기로 내용이 원래대로 돌아와도
 * 다른 객체이므로 "저장 안 됨"으로 남는데, 그편이 안전하다 — 반대로 틀리면
 * 저장되지 않은 것을 저장됐다고 말하게 된다.
 */
export class TemplateFiling {
  /** 마지막으로 보관소에 넣은(또는 꺼낸) 바로 그 객체다. */
  private savedTemplate: Template;

  /** 저장 진행과 실패는 문서를 바꾸지 않으므로 여기서 따로 들고 있는다. */
  private transientState: SaveState | null = null;

  /** 한 번이라도 보관소에 넣었는지. 처음 쓰는 사람에게 안내할 때 쓴다. */
  private everSaved = false;

  private readonly listeners = new Set<() => void>();

  /** 편집 세션과 호스트 보관소를 이어 둔다. 보관소는 없을 수도 있다. */
  constructor(
    private readonly controller: EditorController,
    private readonly library: TemplateLibrary | null,
  ) {
    this.savedTemplate = controller.getTemplate();
  }

  /** 호스트가 보관소를 주지 않으면 저장 UI 자체를 보여 주지 않는다. */
  isAvailable(): boolean {
    return this.library !== null;
  }

  /** 지금 보여 줄 저장 상태다. */
  state(): SaveState {
    if (this.transientState !== null) return this.transientState;
    return this.controller.getTemplate() === this.savedTemplate
      ? SaveState.saved()
      : SaveState.unsaved();
  }

  /**
   * 지금 문서를 보관소에 넣는다.
   *
   * **넣기 시작한 그 객체를 기준으로 삼는다.** 넣는 동안 사람이 계속 고칠 수
   * 있는데, 끝난 시점의 문서를 저장된 것으로 치면 저장되지 않은 변경이 저장된
   * 것처럼 보인다.
   */
  async save(): Promise<void> {
    const library = this.library;
    if (library === null || !this.state().canSave()) return;
    const target = this.controller.getTemplate();
    this.setTransientState(SaveState.saving());
    try {
      await library.save(target);
      this.savedTemplate = target;
      this.everSaved = true;
      this.setTransientState(null);
    } catch (error) {
      this.setTransientState(SaveState.failed(TemplateFiling.describe(error)));
    }
  }

  /**
   * 이 편집 세션에서 한 번이라도 저장했는지 알려 준다.
   *
   * 지금 저장되어 있는지(`state()`)와 다른 물음이다. 방금 연 문서는 저장된
   * 상태지만 이 사람이 저장을 해 본 적은 없다.
   */
  hasEverSaved(): boolean {
    return this.everSaved;
  }

  /** 열 수 있는 문서 목록을 준다. 보관소가 없으면 빈 목록이다. */
  async list(): Promise<readonly TemplateSummary[]> {
    if (this.library === null) return [];
    return this.library.list();
  }

  /**
   * 목록에서 고른 문서로 편집 세션을 갈아 끼운다.
   *
   * 꺼낸 그대로가 기준이 된다. 열자마자 "저장 안 됨"으로 보이면 사람은 무엇을
   * 잃을까 봐 저장을 누르고, 방금 연 것을 그대로 덮어쓴다.
   *
   * 꺼내지 못하면 **지금 문서를 건드리지 않는다.** 열기에 실패했는데 편집기가
   * 비어 버리면, 저장하지 않은 작업이 있던 사람은 그것까지 잃는다.
   */
  async open(id: string): Promise<void> {
    if (this.library === null) return;
    try {
      const template = await this.library.load(id);
      this.savedTemplate = template;
      this.controller.openTemplate(template);
      this.setTransientState(null);
    } catch (error) {
      this.setTransientState(SaveState.failed(TemplateFiling.describe(error)));
    }
  }

  /** 저장 상태가 바뀌는 것을 화면이 따라오게 한다. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 진행·실패 표시를 바꾸고 화면에 알린다. */
  private setTransientState(state: SaveState | null): void {
    this.transientState = state;
    this.notify();
  }

  /** 구독 중인 화면을 모두 다시 그리게 한다. */
  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  /** 호스트가 무엇을 던지든 사람이 읽을 수 있는 한 줄로 만든다. */
  private static describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
