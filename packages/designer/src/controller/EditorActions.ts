import {
  Frame,
  type Content,
  type Element,
  type PageSpec,
  type TemplateVariable,
  type TextElement,
} from "@report-tool/core";
import { AddElementCommand } from "../command/AddElementCommand.js";
import { ChangeElementCommand } from "../command/ChangeElementCommand.js";
import { ChangePageCommand } from "../command/ChangePageCommand.js";
import { ChangeVariablesCommand } from "../command/ChangeVariablesCommand.js";
import { CompositeCommand } from "../command/CompositeCommand.js";
import type { EditorCommand } from "../command/EditorCommand.js";
import { RemoveElementCommand } from "../command/RemoveElementCommand.js";
import {
  UpdateTableCellCommand,
  UpdateTableHeaderCommand,
} from "../command/TableCommands.js";
import { TransformElementCommand } from "../command/TransformElementCommand.js";
import type { EditorController } from "./EditorController.js";
import { ElementAlignment, type AlignKind, type DistributeAxis } from "./ElementAlignment.js";
import { ElementCloner } from "./ElementCloner.js";
import { LayerOrder } from "./LayerOrder.js";
import { TableCellValueParser } from "./TableCellValueParser.js";

/**
 * 사용자 행동 하나를 Undo 한 번으로 되돌릴 수 있는 명령으로 바꾼다.
 *
 * 툴바·Inspector·Layers·단축키가 각자 명령을 조립하면 같은 행동이 화면마다
 * 다른 Undo 단위를 만든다. 행동의 정의를 이 클래스 하나로 모아 그것을 막는다.
 */
export class EditorActions {
  private readonly cloner = new ElementCloner();
  private readonly layerOrder = new LayerOrder();
  private readonly alignment = new ElementAlignment();
  private readonly cellValueParser = new TableCellValueParser();

  /** 모든 행동이 같은 상태 경계를 통해 실행되게 한다. */
  constructor(private readonly controller: EditorController) {}

  /** 선택된 요소 전체를 한 번의 실행 취소로 복원 가능하게 삭제한다. */
  deleteSelection(): void {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    this.run(ids.map((id) => new RemoveElementCommand(id)));
    this.controller.selectElement(null);
  }

  /** 선택 요소를 살짝 밀어 놓은 사본으로 복제하고 사본을 선택한다. */
  duplicateSelection(): void {
    const elements = this.unlockedSelection();
    if (elements.length === 0) return;
    this.addClones(this.cloner.cloneAll(elements));
  }

  /** 이후 원본이 바뀌어도 붙여넣을 수 있도록 선택 요소를 보관한다. */
  copySelection(): void {
    const elements = this.controller.getSelectedElements();
    if (elements.length === 0) return;
    this.controller.getClipboard().copy(elements);
  }

  /** 보관된 요소를 새 식별자로 추가하고 붙여넣은 것을 선택한다. */
  paste(): void {
    const clones = this.controller.getClipboard().paste();
    if (clones.length === 0) return;
    this.addClones(clones);
  }

  /** 방향키 이동이 잠긴 요소를 건드리지 않고 한 번의 이력만 남기게 한다. */
  nudgeSelection(deltaXMm: number, deltaYMm: number): void {
    const elements = this.unlockedSelection();
    if (elements.length === 0) return;
    this.run(elements.map((element) => new TransformElementCommand(
      element.id, element.frame, element.frame.moveBy(deltaXMm, deltaYMm),
    )));
  }

  /** Inspector의 mm 입력이 드래그와 같은 변형 이력을 남기게 한다. */
  setFrame(element: Element, frame: Frame): void {
    if (element.frame.equals(frame)) return;
    this.controller.execute(new TransformElementCommand(element.id, element.frame, frame));
  }

  /** 캔버스 입력 확정이 문구 종류를 유지한 하나의 변경으로 기록되게 한다. */
  commitTextContent(element: TextElement, value: string): void {
    const content: Content = { kind: element.content.kind, value };
    this.changeElement(element, element.withContent(content));
  }

  /** 사용자가 정한 헤더 문구를 열의 데이터 연결과 분리해 기록한다. */
  commitTableHeader(tableId: string, columnIndex: number, header: string): void {
    this.controller.execute(new UpdateTableHeaderCommand(tableId, columnIndex, header));
  }

  /**
   * 사용자가 입력한 셀 값을 템플릿에 저장한다.
   *
   * 문자열을 그대로 넣지 않고 한 번 해석하는 이유는, 금액 열이 숫자를 기대하기 때문이다.
   */
  commitTableCell(
    tableId: string,
    rowIndex: number,
    columnKey: string,
    input: string,
  ): void {
    this.controller.execute(new UpdateTableCellCommand(
      tableId, rowIndex, columnKey, this.cellValueParser.parse(input),
    ));
  }

  /** 속성 하나를 바꾼 요소를 같은 교체 규칙으로 반영한다. */
  changeElement(before: Element, after: Element): void {
    if (before === after) return;
    this.controller.execute(new ChangeElementCommand(before, after));
  }

  /** 잠금 토글이 다른 속성을 건드리지 않는 한 번의 변경으로 기록되게 한다. */
  toggleLocked(element: Element): void {
    this.changeElement(element, element.withLocked(!element.locked));
  }

  /** 숨김 토글이 선택 상태와 무관하게 항상 동작하게 한다. */
  toggleHidden(element: Element): void {
    this.changeElement(element, element.withHidden(!element.hidden));
  }

  /** 선택 요소를 가장 위로 올린다. */
  bringToFront(): void {
    this.applyOrder(this.layerOrder.toFront(this.allElements(), this.selectedIds()));
  }

  /** 선택 요소를 가장 아래로 내린다. */
  sendToBack(): void {
    this.applyOrder(this.layerOrder.toBack(this.allElements(), this.selectedIds()));
  }

  /** 선택 요소를 한 칸 위로 올린다. */
  bringForward(): void {
    this.applyOrder(this.layerOrder.forward(this.allElements(), this.selectedIds()));
  }

  /** 선택 요소를 한 칸 아래로 내린다. */
  sendBackward(): void {
    this.applyOrder(this.layerOrder.backward(this.allElements(), this.selectedIds()));
  }

  /** 하나만 선택하면 페이지 배치 영역, 여럿이면 선택 경계에 맞춘다. */
  align(kind: AlignKind): void {
    const elements = this.unlockedSelection();
    if (elements.length === 0) return;
    const reference = this.alignment.referenceFrame(
      elements, this.controller.getTemplate().page.contentFrame(),
    );
    this.applyFrames(elements, this.alignment.align(elements, kind, reference));
  }

  /** 세 개 이상 선택했을 때만 같은 간격으로 벌린다. */
  distribute(axis: DistributeAxis): void {
    const elements = this.unlockedSelection();
    this.applyFrames(elements, this.alignment.distribute(elements, axis));
  }

  /**
   * 새 선언을 한 번에 추가한다.
   *
   * 배열과 그 자식들은 사용자가 한 번 만든 것이므로 Undo도 한 번이어야 한다.
   * 이름이 겹치면 그 선언만 건너뛰고 무엇을 건너뛰었는지 알린다. 같은 이름이
   * 둘이면 어느 값이 나갈지 정할 수 없다.
   */
  addVariables(variables: readonly TemplateVariable[]): void {
    const existing = this.controller.getTemplate().variables;
    const taken = new Set(existing.map((candidate) => candidate.name));
    const added = variables.filter((variable) => !taken.has(variable.name));
    const skipped = variables.filter((variable) => taken.has(variable.name));
    if (added.length > 0) this.replaceVariables([...existing, ...added]);
    if (skipped.length === 0) return;
    this.controller.setNotice(
      `이미 있는 이름은 건너뛰었습니다: ${skipped.map((one) => one.name).join(", ")}`,
    );
  }

  /** 선언 하나만 추가하는 흔한 경우를 짧게 쓰게 한다. */
  addVariable(variable: TemplateVariable): void {
    this.addVariables([variable]);
  }

  /**
   * 선언 하나를 교체한다.
   *
   * 이름이 바뀌면 하위 선언의 경로도 함께 옮겨야 한다. 배열 이름을 고쳤을 때
   * 자식들이 옛 경로에 남으면 팔레트에서 부모를 잃고 목록 바닥으로 떨어진다.
   */
  updateVariable(name: string, variable: TemplateVariable): void {
    this.replaceVariables(this.controller.getTemplate().variables.map((candidate) => {
      if (candidate.name === name) return variable;
      if (!candidate.isChildOf(name)) return candidate;
      return candidate.withName(
        `${variable.name}${candidate.name.slice(name.length)}`,
      );
    }));
  }

  /**
   * 선언과 그 하위 선언을 함께 제거한다.
   *
   * 그 선언을 참조하는 요소는 지우지 않는다. 사용자가 어떤 자리를 무엇으로 바꿀지
   * 정해야 하므로, 편집기는 참조가 깨졌다는 사실만 경고로 보여준다.
   */
  removeVariable(path: string): void {
    const existing = this.controller.getTemplate().variables;
    const remaining = existing.filter(
      (candidate) => !candidate.isSelfOrDescendantOf(path),
    );
    if (remaining.length === existing.length) {
      this.controller.setNotice(`지울 선언을 찾지 못했습니다: ${path}`);
      return;
    }
    this.replaceVariables(remaining);
  }

  /** 용지 설정 변경도 요소 편집과 같은 이력에 남게 한다. */
  changePage(page: PageSpec): void {
    this.controller.execute(new ChangePageCommand(this.controller.getTemplate().page, page));
  }

  /** 잠기거나 숨겨지지 않은 요소 전체를 한 번에 선택하게 한다. */
  selectAll(): void {
    this.controller.selectElements(
      this.allElements()
        .filter((element) => !element.locked && !element.hidden)
        .map((element) => element.id),
    );
  }

  /** 모든 변수 편집이 같은 실행 취소 단위와 검증 경로를 지나게 한다. */
  private replaceVariables(variables: readonly TemplateVariable[]): void {
    this.controller.execute(new ChangeVariablesCommand(
      this.controller.getTemplate().variables, variables,
    ));
  }

  /** 사본 추가와 선택 전환이 항상 같은 순서로 일어나게 한다. */
  private addClones(clones: readonly Element[]): void {
    this.run(clones.map((clone) => new AddElementCommand(clone)));
    this.controller.selectElements(clones.map((clone) => clone.id));
  }

  /** 계산된 z 배정을 실제 요소 교체 명령으로 바꾼다. */
  private applyOrder(changes: ReadonlyMap<string, number>): void {
    const commands: EditorCommand[] = [];
    for (const [elementId, z] of changes) {
      const element = this.controller.getElement(elementId);
      if (element === undefined) continue;
      commands.push(new ChangeElementCommand(element, element.withZ(z)));
    }
    this.run(commands);
  }

  /** 계산된 배치를 실제 변형 명령으로 바꾼다. */
  private applyFrames(
    elements: readonly Element[],
    changes: ReadonlyMap<string, Frame>,
  ): void {
    this.run(elements
      .filter((element) => changes.has(element.id))
      .map((element) => new TransformElementCommand(
        element.id, element.frame, changes.get(element.id)!,
      )));
  }

  /** 여러 명령을 하나의 실행 취소 단위로 실행하고 빈 목록은 무시한다. */
  private run(commands: readonly EditorCommand[]): void {
    if (commands.length === 0) return;
    if (commands.length === 1) {
      this.controller.execute(commands[0]!);
      return;
    }
    this.controller.execute(new CompositeCommand(commands));
  }

  /** 잠긴 요소를 배치 변경 대상에서 제외하는 규칙을 한곳에 둔다. */
  private unlockedSelection(): readonly Element[] {
    return this.controller.getSelectedElements()
      .filter((element) => !element.locked);
  }

  /** 순서 계산이 항상 템플릿 전체를 기준으로 이뤄지게 한다. */
  private allElements(): readonly Element[] {
    return this.controller.getTemplate().getElements();
  }

  /** 선택 ID 조회를 한곳으로 모아 호출부를 짧게 유지한다. */
  private selectedIds(): readonly string[] {
    return this.controller.getSelectionModel().getSelectedIds();
  }
}
