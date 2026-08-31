import {
  Binding,
  BoundTableSource,
  KoreanParticle,
  StaticTableSource,
  TableColumn,
  type BoxElement,
  type Element,
  type ElementVisitor,
  type FieldElement,
  type ImageElement,
  type ImageFit,
  type LineElement,
  type SignatureElement,
  type TableColumnAlign,
  type TableElement,
  type TextElement,
} from "@report-tool/core";
import type { ReactNode } from "react";
import {
  AddTableColumnCommand,
  AddTableRowCommand,
  BindTableColumnCommand,
  ChangeHeaderFillCommand,
  ChangeTableSourceCommand,
  RemoveTableColumnCommand,
  RemoveTableRowCommand,
  ResizeTableColumnCommand,
  SetTableHeaderSpanCommand,
  SetTableMergeWhenEmptyCommand,
  ToggleHeaderColumnCommand,
  ToggleHeaderRowCommand,
  UpdateTableHeaderCommand,
} from "../../command/TableCommands.js";
import type { EditorActions } from "../../controller/EditorActions.js";
import type { EditorController } from "../../controller/EditorController.js";
import type { PaletteEntry } from "../../controller/PaletteEntry.js";
import { TableEditor } from "../../controller/TableEditor.js";
import {
  ChoiceField,
  ColorField,
  InspectorRow,
  InspectorSection,
  NumberField,
  SelectField,
  TextField,
  ToggleField,
} from "./InspectorFields.js";
import { TextStyleEditor } from "./TextStyleEditor.js";

/**
 * 선택한 요소 종류에 맞는 속성 편집 화면을 만든다.
 *
 * Visitor로 구현하는 이유는 요소를 추가할 때 Inspector 구현을 빠뜨리면
 * 컴파일이 실패하게 만들기 위해서다. 조건문으로 나열하면 조용히 빠진다.
 */
export class ElementInspectorVisitor implements ElementVisitor<ReactNode> {
  /** 새 열이 항상 그릴 수 있는 크기로 추가되게 기본 너비를 고정한다. */
  private static readonly NEW_COLUMN_WIDTH_MM = 20;

  /** 직접 입력한 행을 쓰겠다는 선택을 드롭다운에서 표현하는 값이다. */
  private static readonly STATIC_SOURCE_VALUE = "";

  /** 아직 데이터에 연결하지 않은 열을 드롭다운에서 표현하는 값이다. */
  private static readonly UNBOUND_COLUMN_VALUE = "";

  private readonly tableEditor = new TableEditor();

  /** 모든 속성 변경이 같은 행동 정의와 상태 경계를 사용하게 한다. */
  constructor(
    private readonly actions: EditorActions,
    private readonly controller: EditorController,
    private readonly entries: readonly PaletteEntry[] = [],
  ) {}

  /** 화면이 요소 종류를 모른 채 속성 편집 영역을 얻게 한다. */
  build(element: Element): ReactNode {
    return element.accept(this);
  }

  /** 고정 문구와 글자 표현을 함께 편집하게 한다. */
  visitText(element: TextElement): ReactNode {
    return (
      <>
        <InspectorSection title="문구" hint="캔버스에서 더블클릭해도 편집됩니다">
          <TextField
            label="내용"
            value={element.content.value}
            onCommit={(value) => this.actions.changeElement(
              element, element.withContent({ kind: element.content.kind, value }),
            )}
          />
          <SelectField
            label="종류"
            value={element.content.kind}
            options={[
              { value: "literal", label: "고정 문구" },
              { value: "template", label: "데이터 문구" },
            ]}
            onCommit={(kind) => this.actions.changeElement(
              element, element.withContent({ kind, value: element.content.value }),
            )}
          />
        </InspectorSection>
        <InspectorSection title="글자">
          <TextStyleEditor
            style={element.style}
            onCommit={(style) => this.actions.changeElement(element, element.withStyle(style))}
          />
        </InspectorSection>
      </>
    );
  }

  /** 연결된 데이터 경로와 표시 방식을 함께 보여준다. */
  visitField(element: FieldElement): ReactNode {
    return (
      <>
        <InspectorSection title="데이터 연결" hint="왼쪽 데이터 패널에서 바꿉니다">
          <div className="rt-token-chip">{element.binding.path.toString()}</div>
          <TextField
            label="값 없을 때"
            value={element.binding.fallback ?? ""}
            placeholder="빈칸으로 표시"
            onCommit={(fallback) => this.commitBinding(element, { fallback })}
          />
          <ToggleField
            label="필수 값"
            value={element.binding.required}
            onCommit={(required) => this.commitBinding(element, { required })}
          />
        </InspectorSection>
        <InspectorSection title="글자">
          <TextStyleEditor
            style={element.style}
            onCommit={(style) => this.actions.changeElement(element, element.withStyle(style))}
          />
        </InspectorSection>
      </>
    );
  }

  /** 표의 구조·행·열·글자를 한 화면에서 다루게 한다. */
  visitTable(element: TableElement): ReactNode {
    return (
      <>
        {this.tableStructureSection(element)}
        {this.tableRowsSection(element)}
        {this.tableColumnsSection(element)}
        <InspectorSection title="머리글 표현" hint="지정한 줄·열에 함께 적용">
          <ColorField
            label="배경"
            value={element.headerFill ?? undefined}
            allowEmpty
            onCommit={(headerFill) => this.controller.execute(
              new ChangeHeaderFillCommand(element.id, headerFill ?? null),
            )}
          />
          <TextStyleEditor
            style={element.headerStyle}
            showOverflow={false}
            onCommit={(headerStyle) => this.actions.changeElement(
              element, element.withStyles({ headerStyle }),
            )}
          />
        </InspectorSection>
        <InspectorSection title="본문 글자">
          <TextStyleEditor
            style={element.cellStyle}
            showOverflow={false}
            onCommit={(cellStyle) => this.actions.changeElement(
              element, element.withStyles({ cellStyle }),
            )}
          />
        </InspectorSection>
      </>
    );
  }

  /** 이미지 출처와 영역 채우기 방식을 편집하게 한다. */
  visitImage(element: ImageElement): ReactNode {
    return (
      <InspectorSection title="이미지">
        <TextField
          label="자산 ID"
          value={element.assetId ?? ""}
          placeholder="호스트가 해석할 식별자"
          warning={this.isEmptyAsset(element) ? "출처가 없으면 발행 시 비어 있게 나옵니다" : undefined}
          onCommit={(assetId) => this.actions.changeElement(
            element, element.withSource({ assetId }),
          )}
        />
        <SelectField<ImageFit>
          label="채우기"
          value={element.fit}
          options={[
            { value: "contain", label: "비율 유지(안쪽)" },
            { value: "cover", label: "비율 유지(채움)" },
            { value: "stretch", label: "영역에 맞춤" },
          ]}
          onCommit={(fit) => this.actions.changeElement(element, element.withFit(fit))}
        />
      </InspectorSection>
    );
  }

  /** 상자의 채움과 테두리 표현을 편집하게 한다. */
  visitBox(element: BoxElement): ReactNode {
    return (
      <InspectorSection title="상자">
        <ColorField
          label="채움"
          value={element.fill}
          allowEmpty
          onCommit={(fill) => this.actions.changeElement(
            element, element.withAppearance({ fill }),
          )}
        />
        <ColorField
          label="테두리"
          value={element.stroke}
          allowEmpty
          onCommit={(stroke) => this.actions.changeElement(
            element, element.withAppearance({ stroke }),
          )}
        />
        <InspectorRow>
          <NumberField
            label="테두리 굵기"
            value={element.strokeWidth ?? 0}
            step={0.1}
            min={0}
            suffix="mm"
            onCommit={(strokeWidth) => this.actions.changeElement(
              element, element.withAppearance({ strokeWidth }),
            )}
          />
          <NumberField
            label="모서리"
            value={element.radius ?? 0}
            step={0.5}
            min={0}
            suffix="mm"
            onCommit={(radius) => this.actions.changeElement(
              element, element.withAppearance({ radius }),
            )}
          />
        </InspectorRow>
      </InspectorSection>
    );
  }

  /** 선의 색·굵기·점선 여부를 편집하게 한다. */
  visitLine(element: LineElement): ReactNode {
    return (
      <InspectorSection title="선">
        <ColorField
          label="색"
          value={element.stroke}
          onCommit={(stroke) => this.actions.changeElement(
            element, element.withAppearance({ stroke: stroke ?? "#334155" }),
          )}
        />
        <NumberField
          label="굵기"
          value={element.strokeWidth}
          step={0.1}
          min={0.05}
          suffix="mm"
          onCommit={(strokeWidth) => this.actions.changeElement(
            element, element.withAppearance({ strokeWidth }),
          )}
        />
        <ToggleField
          label="점선"
          value={element.dash !== undefined}
          onCommit={(dashed) => this.actions.changeElement(
            element, element.withAppearance({ dash: dashed ? [1.5, 1.5] : undefined }),
          )}
        />
      </InspectorSection>
    );
  }

  /** 서명자와 필수 여부, 안내 문구를 편집하게 한다. */
  visitSignature(element: SignatureElement): ReactNode {
    return (
      <InspectorSection title="서명">
        <TextField
          label="서명자"
          value={element.signer}
          placeholder="employee"
          warning={element.signer.length === 0 ? "서명자가 없으면 서명 요청을 만들 수 없습니다" : undefined}
          onCommit={(signer) => this.actions.changeElement(
            element, element.withSignature({ signer }),
          )}
        />
        <TextField
          label="안내 문구"
          value={element.label ?? ""}
          placeholder="서명"
          onCommit={(label) => this.actions.changeElement(
            element, element.withSignature({ label: label === "" ? undefined : label }),
          )}
        />
        <ToggleField
          label="필수 서명"
          value={element.required}
          onCommit={(required) => this.actions.changeElement(
            element, element.withSignature({ required }),
          )}
        />
      </InspectorSection>
    );
  }

  /** 행 공급 방식과 표 전체에 적용되는 값을 한 섹션에 모은다. */
  private tableStructureSection(element: TableElement): ReactNode {
    const bound = element.source instanceof BoundTableSource ? element.source : null;
    return (
      <InspectorSection title="표 구조" hint={bound === null ? "직접 입력한 행" : "데이터 배열"}>
        <SelectField
          label="행 출처"
          value={bound?.binding.path.toString() ?? ElementInspectorVisitor.STATIC_SOURCE_VALUE}
          options={this.sourceOptions()}
          onCommit={(path) => this.changeSource(element, path)}
        />
        {bound === null
          ? (
            <p className="rt-inspector-note">
              셀을 직접 입력하는 표입니다. 캔버스에서 칸을 더블클릭해 고치고,
              값이 사람마다 달라야 하면 <code>{"{{경로}}"}</code>를 적으세요.
            </p>
          )
          : null}
        <InspectorRow>
          <NumberField
            label="행 높이"
            value={element.rowHeight}
            step={0.5}
            min={2}
            suffix="mm"
            onCommit={(rowHeight) => this.actions.changeElement(
              element, element.withRowHeight(rowHeight),
            )}
          />
          <NumberField
            label="열 수"
            value={element.columns.length}
            min={1}
            disabled
            onCommit={() => undefined}
          />
        </InspectorRow>
      </InspectorSection>
    );
  }

  /**
   * 어떤 줄이 머리글인지 정하는 스위치를 한 목록에 모은다.
   *
   * 맨 윗줄 머리글과 행 머리글이 서로 다른 섹션에 있으면, 같은 짙은색을 만드는
   * 스위치를 두 곳에서 찾아야 한다. 실제로 열 머리글을 껐는데 맨 윗줄이 그대로
   * 짙어서 "스위치가 안 듣는다"고 읽혔다. 짙어지는 줄은 모두 여기서 정한다.
   */
  private tableRowsSection(element: TableElement): ReactNode {
    const rows = element.source instanceof StaticTableSource ? element.source.rows : null;
    return (
      <InspectorSection title="행" hint={rows === null ? "데이터 배열" : `${rows.length}개`}>
        <p className="rt-inspector-note">
          머리글로 지정한 줄은 머리글 글자(굵기·색)와 머리글 배경을 씁니다.
        </p>
        <div className="rt-column-card">
          <ToggleField
            label="맨 윗줄 머리글 (열 이름)"
            value={element.showHeader}
            onCommit={(showHeader) => this.actions.changeElement(
              element, element.withHeaderVisibility(showHeader),
            )}
          />
        </div>
        {rows === null
          ? (
            <p className="rt-inspector-note">
              본문 행은 연결된 데이터 배열에서 오므로 줄마다 지정할 수 없습니다.
            </p>
          )
          : null}
        {(rows ?? []).map((_row, index) => (
          <div className="rt-column-card" key={`row-${index}`}>
            <ToggleField
              label={`${index + 1}행 머리글`}
              value={element.headerCells.hasRow(index)}
              onCommit={() => this.controller.execute(
                new ToggleHeaderRowCommand(element.id, index),
              )}
            />
            <div className="rt-button-row">
              <button
                type="button"
                className="rt-panel-button"
                onClick={() => this.controller.execute(
                  new AddTableRowCommand(element.id, index + 1),
                )}
              >
                ＋ 아래에 행
              </button>
              <button
                type="button"
                className="rt-panel-button"
                onClick={() => this.controller.execute(
                  new RemoveTableRowCommand(element.id, index),
                )}
              >
                － 이 행 삭제
              </button>
            </div>
          </div>
        ))}
        {rows === null ? null : (
          <div className="rt-button-row">
            <button
              type="button"
              className="rt-panel-button"
              onClick={() => this.controller.execute(
                new AddTableRowCommand(element.id, rows.length),
              )}
            >
              ＋ 행 추가 ({rows.length})
            </button>
          </div>
        )}
      </InspectorSection>
    );
  }

  /** 직접 입력과 선언된 배열을 한 목록으로 고르게 한다. */
  private sourceOptions(): readonly Readonly<{ value: string; label: string }>[] {
    return [
      { value: ElementInspectorVisitor.STATIC_SOURCE_VALUE, label: "직접 입력한 행" },
      ...this.arrayEntries().map((entry) => ({
        value: entry.path,
        label: `${entry.label} (${entry.path})`,
      })),
    ];
  }

  /**
   * 표로 만들 수 있는 배열 선언만 고른다.
   *
   * 자식이 없는 배열은 열을 만들 수 없어 고르는 순간 예외가 되므로 목록에 넣지 않는다.
   */
  private arrayEntries(): readonly PaletteEntry[] {
    return this.entries.filter((entry) => (
      entry.type === "array" && entry.children.some((child) => child.type !== "array")
    ));
  }

  /**
   * 행 출처를 바꾸고, 사라지는 것이 있으면 반드시 알린다.
   *
   * 배열을 바꾸면 열 구성이 그 배열의 자식으로 통째로 교체된다. 직접 만든 열이
   * 말없이 사라지면 사용자는 자기가 무엇을 잃었는지 모른다.
   */
  private changeSource(element: TableElement, path: string): void {
    if (path === ElementInspectorVisitor.STATIC_SOURCE_VALUE) {
      this.controller.execute(
        new ChangeTableSourceCommand(element.id, new StaticTableSource([])),
      );
      return;
    }
    const entry = this.arrayEntries().find((candidate) => candidate.path === path);
    if (entry === undefined) return;
    const discardedRows = this.tableEditor.discardedRowCount(element);
    const previousColumns = element.columns.length;
    const bound = this.tableEditor.bindArray(element, entry.path, entry.children);
    this.actions.changeElement(element, bound);
    this.noticeSourceChange(discardedRows, previousColumns, bound.columns.length);
  }

  /** 전환으로 사라진 행과 열을 한 문장으로 알린다. */
  private noticeSourceChange(
    discardedRows: number,
    previousColumns: number,
    nextColumns: number,
  ): void {
    const losses: string[] = [];
    if (discardedRows > 0) losses.push(`직접 입력한 ${discardedRows}행`);
    if (previousColumns !== nextColumns) losses.push(`열 구성 ${previousColumns}개`);
    if (losses.length === 0) return;
    this.controller.setNotice(
      `${KoreanParticle.subjectOf(losses.join("과 "))} 배열 구조로 바뀌었습니다.`
      + " ⌘Z로 되돌릴 수 있습니다.",
    );
  }

  /** 열별 헤더·너비·정렬과 열 추가·삭제를 한 섹션에 모은다. */
  private tableColumnsSection(element: TableElement): ReactNode {
    return (
      <InspectorSection title="열" hint={`${element.columns.length}개`}>
        <p className="rt-inspector-note">
          머리글 열은 모든 줄에서 짙어집니다. 맨 윗줄만 짙은 것은 [행]의
          맨 윗줄 머리글 때문입니다.
        </p>
        {element.columns.map((column, index) => (
          <div className="rt-column-card" key={`${column.key}-${index}`}>
            <TextField
              label={`${index + 1}번 헤더`}
              value={column.header}
              onCommit={(header) => this.controller.execute(
                new UpdateTableHeaderCommand(element.id, index, header),
              )}
            />
            <ToggleField
              label="머리글 열"
              value={element.headerCells.hasColumn(index)}
              onCommit={() => this.controller.execute(
                new ToggleHeaderColumnCommand(element.id, index),
              )}
            />
            <InspectorRow>
              <NumberField
                label="너비"
                value={column.width}
                step={1}
                min={2}
                suffix="mm"
                onCommit={(width) => this.controller.execute(
                  new ResizeTableColumnCommand(element.id, index, width),
                )}
              />
              <ChoiceField<TableColumnAlign>
                label="정렬"
                value={column.align}
                options={[
                  { value: "left", label: "좌" },
                  { value: "center", label: "중" },
                  { value: "right", label: "우" },
                ]}
                onCommit={(align) => this.changeColumnAlign(element, index, align)}
              />
            </InspectorRow>
            <InspectorRow>
              <NumberField
                label="머리글 병합"
                value={column.headerSpan}
                step={1}
                min={1}
                max={element.columns.length - index}
                suffix="열"
                onCommit={(headerSpan) => this.controller.execute(
                  new SetTableHeaderSpanCommand(element.id, index, headerSpan),
                )}
              />
              {index === 0 ? null : (
                <ToggleField
                  label="비면 앞 칸이 덮음"
                  value={column.mergesWhenEmpty}
                  onCommit={(mergesWhenEmpty) => this.controller.execute(
                    new SetTableMergeWhenEmptyCommand(element.id, index, mergesWhenEmpty),
                  )}
                />
              )}
            </InspectorRow>
            {this.columnDataField(element, column, index)}
            <div className="rt-column-card-foot">
              <span className="rt-token-chip rt-token-chip--muted">{column.cellTemplate}</span>
              <button
                type="button"
                className="rt-icon-button"
                title="이 열 삭제"
                disabled={element.columns.length === 1}
                onClick={() => this.controller.execute(
                  new RemoveTableColumnCommand(element.id, index),
                )}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rt-panel-button"
          onClick={() => this.addColumn(element)}
        >
          ＋ 열 추가
        </button>
      </InspectorSection>
    );
  }

  /**
   * 데이터 표의 열이 배열의 어떤 자식을 쓸지 고르게 한다.
   *
   * 지금까지 이 연결을 바꾸는 방법은 팔레트에서 그 열 위로 끌어다 놓는 것뿐이었다.
   * 화면 어디에도 안내가 없었고, 열이 표 밖으로 밀려나 있으면 드롭 자체가 되지
   * 않았다. 좌표에 의존하지 않는 길을 열어 둔다.
   *
   * 정적 표는 열이 아니라 셀 하나하나가 값을 정하므로 이 목록을 두지 않는다.
   */
  private columnDataField(
    element: TableElement,
    column: TableColumn,
    index: number,
  ): ReactNode {
    if (!(element.source instanceof BoundTableSource)) return null;
    const children = this.boundChildren(element);
    if (children.length === 0) return null;
    return (
      <SelectField
        label="데이터"
        value={children.some((child) => this.childKey(child) === column.key)
          ? column.key
          : ElementInspectorVisitor.UNBOUND_COLUMN_VALUE}
        options={[
          { value: ElementInspectorVisitor.UNBOUND_COLUMN_VALUE, label: "연결 안 함" },
          ...children.map((child) => ({
            value: this.childKey(child),
            label: child.label,
          })),
        ]}
        onCommit={(key) => this.bindColumn(element, index, column, key)}
      />
    );
  }

  /** 이 표가 반복하는 배열의 자식 중 열이 될 수 있는 것만 고른다. */
  private boundChildren(element: TableElement): readonly PaletteEntry[] {
    if (!(element.source instanceof BoundTableSource)) return [];
    const path = element.source.binding.path.toString();
    const array = this.entries.find((entry) => entry.path === path);
    return array?.children.filter((child) => child.type !== "array") ?? [];
  }

  /** 열 표현식은 배열 경로가 아니라 행 안의 키를 참조해야 한다. */
  private childKey(child: PaletteEntry): string {
    const separator = child.path.lastIndexOf(".");
    return separator === -1 ? child.path : child.path.slice(separator + 1);
  }

  /**
   * 고른 자식으로 열을 다시 연결한다.
   *
   * 헤더는 사용자가 이미 고쳤을 수 있으므로 함부로 덮지 않는다. 아직 손대지 않은
   * 자동 이름(`열 3`)이거나 비어 있을 때만 자식의 표시 이름으로 바꾼다.
   */
  private bindColumn(
    element: TableElement,
    index: number,
    column: TableColumn,
    key: string,
  ): void {
    if (key === ElementInspectorVisitor.UNBOUND_COLUMN_VALUE) return;
    const child = this.boundChildren(element).find((one) => this.childKey(one) === key);
    if (child === undefined) return;
    this.controller.execute(new BindTableColumnCommand(
      element.id, index, key, child.label, this.isAutomaticHeader(column.header),
    ));
  }

  /** 사용자가 직접 정한 헤더인지 판단한다. */
  private isAutomaticHeader(header: string): boolean {
    return header.trim() === "" || /^열 \d+$/.test(header.trim());
  }

  /** 새 열의 key가 기존 열과 충돌하지 않게 만들어 추가한다. */
  private addColumn(element: TableElement): void {
    const used = new Set(element.columns.map((column) => column.key));
    let index = element.columns.length + 1;
    while (used.has(`column${index}`)) index += 1;
    const key = `column${index}`;
    this.controller.execute(new AddTableColumnCommand(
      element.id,
      new TableColumn(
        key,
        `열 ${index}`,
        `{{row.${key}}}`,
        ElementInspectorVisitor.NEW_COLUMN_WIDTH_MM,
        "left",
        null,
      ),
      element.columns.length,
    ));
  }

  /** 열 정렬 변경이 열의 다른 설정을 유지하게 한다. */
  private changeColumnAlign(
    element: TableElement,
    index: number,
    align: TableColumnAlign,
  ): void {
    const column = element.columns[index];
    if (column === undefined) return;
    const columns = element.columns.map((candidate, candidateIndex) => (
      candidateIndex === index
        ? new TableColumn(
          column.key, column.header, column.cellTemplate,
          column.width, align, column.formatSpec,
        )
        : candidate
    ));
    this.actions.changeElement(element, element.withColumns(columns));
  }

  /** 바인딩의 나머지 설정을 유지하며 일부 값만 교체해 반영한다. */
  private commitBinding(
    element: FieldElement,
    changes: Readonly<{ fallback?: string; required?: boolean }>,
  ): void {
    const binding = element.binding;
    const fallback = changes.fallback ?? binding.fallback ?? "";
    const next = new Binding(binding.path.toString(), {
      formatSpec: binding.formatSpec ?? undefined,
      fallback: fallback === "" ? undefined : fallback,
      required: changes.required ?? binding.required,
    });
    this.actions.changeElement(element, element.withBinding(next));
  }

  /** 자산 식별자가 비었는지 판단하는 규칙을 한곳에 둔다. */
  private isEmptyAsset(element: ImageElement): boolean {
    return element.binding === undefined
      && (element.assetId === undefined || element.assetId.length === 0);
  }
}
