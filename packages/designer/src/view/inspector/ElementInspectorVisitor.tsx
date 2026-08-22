import {
  Binding,
  BoundTableSource,
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
  ChangeTableSourceCommand,
  RemoveTableColumnCommand,
  RemoveTableRowCommand,
  ResizeTableColumnCommand,
  UpdateTableHeaderCommand,
} from "../../command/TableCommands.js";
import type { EditorActions } from "../../controller/EditorActions.js";
import type { EditorController } from "../../controller/EditorController.js";
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

  /** 모든 속성 변경이 같은 행동 정의와 상태 경계를 사용하게 한다. */
  constructor(
    private readonly actions: EditorActions,
    private readonly controller: EditorController,
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
        {this.tableColumnsSection(element)}
        <InspectorSection title="헤더 글자">
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
    const staticRowCount = element.source instanceof StaticTableSource
      ? element.source.resolveRows({}).length
      : 0;
    return (
      <InspectorSection title="표 구조" hint={bound === null ? "직접 입력한 행" : "데이터 배열"}>
        {bound === null
          ? (
            <p className="rt-inspector-note">
              직접 입력한 행을 쓰는 표입니다. 데이터 배열에 연결하려면 아직 호스트가
              템플릿에 <code>BoundTableSource</code>로 넣어야 합니다.
            </p>
          )
          : (
            <>
              <div className="rt-token-chip">{bound.binding.path.toString()}</div>
              <button
                type="button"
                className="rt-panel-button"
                onClick={() => this.controller.execute(
                  new ChangeTableSourceCommand(element.id, new StaticTableSource([])),
                )}
              >
                직접 입력한 행으로 바꾸기
              </button>
            </>
          )}
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
        <ToggleField
          label="헤더 행 표시"
          value={element.showHeader}
          onCommit={(showHeader) => this.actions.changeElement(
            element, element.withHeaderVisibility(showHeader),
          )}
        />
        {bound !== null ? null : (
          <div className="rt-button-row">
            <button
              type="button"
              className="rt-panel-button"
              onClick={() => this.controller.execute(
                new AddTableRowCommand(element.id, staticRowCount),
              )}
            >
              ＋ 행 추가 ({staticRowCount})
            </button>
            <button
              type="button"
              className="rt-panel-button"
              disabled={staticRowCount === 0}
              onClick={() => this.controller.execute(
                new RemoveTableRowCommand(element.id, staticRowCount - 1),
              )}
            >
              － 행 삭제
            </button>
          </div>
        )}
      </InspectorSection>
    );
  }

  /** 열별 헤더·너비·정렬과 열 추가·삭제를 한 섹션에 모은다. */
  private tableColumnsSection(element: TableElement): ReactNode {
    return (
      <InspectorSection title="열" hint={`${element.columns.length}개`}>
        {element.columns.map((column, index) => (
          <div className="rt-column-card" key={`${column.key}-${index}`}>
            <TextField
              label={`${index + 1}번 헤더`}
              value={column.header}
              onCommit={(header) => this.controller.execute(
                new UpdateTableHeaderCommand(element.id, index, header),
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
