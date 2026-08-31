import {
  ContentResolver,
  FieldElement,
  ImageElement,
  PageNumbering,
  SignatureElement,
  StaticTableSource,
  TableElement,
  TableLayout,
  TableRowHeights,
  TemplateExpression,
  TemplateReferences,
  TemplateValidator,
  TextElement,
  TextLayout,
  type Element,
  type PageSpec,
  type Template,
  type TextStyle,
  type TextWidthMeasurer,
} from "@report-tool/core";
import type { PaletteEntry } from "./PaletteEntry.js";

/** 문구가 요소 영역을 넘는지 판단하려면 실제 글자 폭을 알아야 한다. */
export type StyleMeasurerFactory = (style: TextStyle) => TextWidthMeasurer;

/** 편집 화면이 문제의 무게를 다르게 표시할 수 있게 심각도를 구분한다. */
export type IssueSeverity = "error" | "warning";

/** 어떤 요소의 무엇이 문제인지 화면에 그대로 표시할 수 있는 형태로 담는다. */
export interface TemplateIssue {
  readonly elementId: string | null;
  readonly severity: IssueSeverity;
  readonly message: string;
}

/**
 * 발행을 막는 구조 오류와 편집 중 알아야 할 경고를 한 목록으로 모은다.
 *
 * 발행 가능성 판단은 core의 TemplateValidator가 유일한 근거이므로 그대로 사용하고,
 * "종이 밖에 있다"처럼 발행은 되지만 사용자가 의도하지 않았을 상태만 경고로 더한다.
 */
export class TemplateIssueFinder {
  private readonly validator = new TemplateValidator();
  private readonly references = new TemplateReferences();
  private readonly textLayout = new TextLayout();

  /**
   * 팔레트가 만든 데이터 목록을 받아 참조가 실제로 존재하는지도 볼 수 있게 한다.
   *
   * core는 선언을 트리로 펼치지 않는다. 점 경로가 어떤 자식을 만드는지는 편집기만
   * 알므로 "어디에도 없는 경로를 참조한다"는 판단은 이 클래스가 한다.
   */
  constructor(
    private readonly entries: readonly PaletteEntry[] = [],
    private readonly measurerFactory: StyleMeasurerFactory | null = null,
    private readonly sampleData: unknown = {},
  ) {}

  /** 화면이 요소별 배지와 문제 목록을 같은 결과로 그리게 한다. */
  find(template: Template): readonly TemplateIssue[] {
    const errors = this.validator.validate(template).map((error) => ({
      elementId: error.elementId,
      severity: "error" as const,
      message: error.message,
    }));
    const warnings = template.getElements()
      .flatMap((element) => this.warningsFor(element, template.page));
    return [
      ...errors,
      ...warnings,
      ...this.findUnknownReferences(template),
      ...this.findBrokenFollows(template),
    ];
  }

  /**
   * 따라갈 표를 잃어버린 요소를 드러낸다.
   *
   * 연결이 끊긴 캡션은 아무 일도 하지 않는다 — 첫 쪽에는 그대로 있으니 화면만
   * 봐서는 멀쩡하고, 이어지는 쪽에서만 조용히 사라진다. 그 차이는 발행본을
   * 열어 봐야 알 수 있으므로 여기서 미리 말한다.
   */
  private findBrokenFollows(template: Template): readonly TemplateIssue[] {
    const elements = template.getElements();
    return elements.flatMap((element) => {
      const targetId = element.followsElementId;
      if (targetId === null) return [];
      const target = elements.find((candidate) => candidate.id === targetId);
      if (target === undefined) {
        return [this.warning(element, `따라갈 표 ${targetId}를 찾을 수 없다`)];
      }
      if (!(target instanceof TableElement)) {
        return [this.warning(element, "표가 아닌 요소는 따라갈 수 없다")];
      }
      if (target.pageIndex !== element.pageIndex) {
        return [this.warning(element, "따라갈 표가 다른 쪽에 있어 함께 가지 않는다")];
      }
      return [];
    });
  }

  /**
   * 어디에도 정의되지 않은 데이터 경로를 참조하는 요소를 찾는다.
   *
   * 템플릿 선언에 없는 경로는 오타이거나 지운 변수의 흔적이다.
   * 발행하면 그 자리는 빈칸으로 나간다.
   */
  private findUnknownReferences(template: Template): readonly TemplateIssue[] {
    if (this.entries.length === 0) return [];
    const known = new Set(this.knownPaths(this.entries));
    return this.references.collect(template)
      .filter((reference) => !known.has(reference.path))
      .map((reference) => ({
        elementId: reference.elementId,
        severity: "warning" as const,
        message: `정의되지 않은 데이터 경로다: ${reference.path}`,
      }));
  }

  /** 중첩 항목까지 모두 참조 가능한 경로로 펼친다. */
  private knownPaths(entries: readonly PaletteEntry[]): readonly string[] {
    return entries.flatMap((entry) => [entry.path, ...this.knownPaths(entry.children)]);
  }

  /** 요소 하나에서 편집 중 알아야 할 상태를 모두 수집한다. */
  private warningsFor(element: Element, page: PageSpec): readonly TemplateIssue[] {
    const warnings: TemplateIssue[] = [];
    if (this.isOutsidePage(element, page)) {
      warnings.push(this.warning(element, "요소가 페이지 밖으로 벗어났다"));
    }
    if (element instanceof ImageElement && element.assetId === "") {
      warnings.push(this.warning(element, "이미지 출처가 지정되지 않았다"));
    }
    if (element instanceof SignatureElement && element.signer.length === 0) {
      warnings.push(this.warning(element, "서명자가 지정되지 않았다"));
    }
    if (this.isEmptyStaticTable(element)) {
      warnings.push(this.warning(element, "표에 입력된 행이 없다"));
    }
    warnings.push(...this.unresolvedLiteralWarning(element));
    warnings.push(...this.overflowingColumnWarning(element));
    warnings.push(...this.droppedTableRowWarning(element));
    warnings.push(...this.overflowingTextWarning(element));
    return warnings;
  }

  /**
   * 문구가 요소 높이를 넘는 요소를 드러낸다.
   *
   * 넘친 줄을 캔버스가 조용히 지우고 PDF가 종이 밖에 그리던 시절에는, 담당자가
   * 본 문서와 서명자가 받은 문서가 달랐다. 이제 양쪽 다 넘쳐 보이게 두는 대신
   * 여기서 반드시 알린다. 조용히 사라지는 글자가 있어서는 안 된다.
   */
  private overflowingTextWarning(element: Element): readonly TemplateIssue[] {
    if (this.measurerFactory === null) return [];
    const style = this.styleOf(element);
    if (style === null) return [];
    const text = this.textOf(element);
    if (text.length === 0) return [];
    const layout = this.textLayout.layout(
      text, style, element.frame.width, this.measurerFactory(style),
    );
    const neededMm = this.textLayout.heightMm(layout, style);
    if (neededMm <= element.frame.height) return [];
    return [this.warning(
      element,
      `문구 ${layout.lines.length}줄이 요소 높이보다 길다 (${Math.ceil(neededMm)}mm 필요)`,
    )];
  }

  /** 글자를 담는 요소만 넘침 검사 대상으로 좁힌다. */
  private styleOf(element: Element): TextStyle | null {
    if (element instanceof TextElement) return element.style;
    if (element instanceof FieldElement) return element.style;
    return null;
  }

  /** 검사에 쓸 문구를 요소 종류에 맞게 해석한다. */
  private textOf(element: Element): string {
    if (element instanceof TextElement) {
      return ContentResolver.resolve(element.content, this.sampleData);
    }
    if (element instanceof FieldElement) {
      return element.binding.path.toString();
    }
    return "";
  }

  /**
   * 열 너비 합이 표 너비와 다른 표를 드러낸다.
   *
   * 합이 더 크면 마지막 열이 표 밖에 그려지고, 편집기는 요소를 프레임으로 찾으므로
   * 그 열은 눌러도 끌어다 놓아도 반응하지 않는다. 보이는데 만질 수 없는 상태다.
   */
  private overflowingColumnWarning(element: Element): readonly TemplateIssue[] {
    if (!(element instanceof TableElement)) return [];
    const total = element.columns.reduce((sum, column) => sum + column.width, 0);
    if (Math.abs(total - element.frame.width) < 0.1) return [];
    return [this.warning(
      element,
      `열 너비 합 ${this.round(total)}mm가 표 너비 ${this.round(element.frame.width)}mm와 다르다`,
    )];
  }

  /**
   * 경고 계산이 캔버스·발행본과 같은 행 높이를 쓰게 한다.
   *
   * 글자를 잴 수 없는 환경(측정기가 없는 테스트)에서는 지정된 행 높이로 물러난다.
   * 그 경우에도 줄 목록과 자르는 규칙은 같아서 판단이 갈리지 않는다.
   */
  private createTableLayout(): TableLayout {
    const factory = this.measurerFactory;
    if (factory === null) return new TableLayout();
    return new TableLayout(undefined, TableRowHeights.content((style) => factory(style)));
  }

  /**
   * 고정 문구에 남아 있는 데이터 표현식을 드러낸다.
   *
   * 문구 종류가 "고정 문구"면 치환하지 않는 것이 맞다. 문제는 사용자가 그걸 모른 채
   * `{{employee.name}}`을 적는다는 것이다. 실제로 리포트 표지에
   * `-{{customer.shortName}}-`가 코드 그대로 발행됐다. 참조 검사는 데이터 문구만
   * 보므로 이 자리를 영영 지나친다.
   *
   * 쪽 번호(`{{page}}`)는 고정 문구에서도 채워지므로 지적하지 않는다.
   */
  private unresolvedLiteralWarning(element: Element): readonly TemplateIssue[] {
    if (!(element instanceof TextElement)) return [];
    if (element.content.kind !== "literal") return [];
    const paths = TemplateExpression.pathsIn(element.content.value)
      .filter((path) => !PageNumbering.isPageToken(path));
    if (paths.length === 0) return [];
    return [this.warning(
      element,
      `고정 문구에 데이터 표현식이 남아 있다: {{${paths[0]}}}`
      + ` (종류를 "데이터 문구"로 바꾸세요)`,
    )];
  }

  /**
   * 표가 자리를 넘어 다음 쪽으로 이어지는 것을 알린다.
   *
   * 넘치는 줄을 버리던 시절에는 이 경고가 "사라진다"는 뜻이었다. 이제 발행본은
   * 다음 쪽에서 이어 그리므로 사라지지 않는다. 다만 편집 화면은 아직 첫 쪽만
   * 보여 주므로, 담당자가 화면만 보고 "여기까지가 전부"라고 읽지 않게 말한다.
   */
  private droppedTableRowWarning(element: Element): readonly TemplateIssue[] {
    if (!(element instanceof TableElement)) return [];
    const remaining = this.createTableLayout()
      .compute(element, this.sampleData)
      .remainingRowCount;
    if (remaining === 0) return [];
    return [this.warning(
      element,
      `표가 자리를 넘어 ${remaining}줄이 다음 쪽으로 이어진다 (편집 화면에는 첫 쪽만 보입니다)`,
    )];
  }

  /** 경고 문구에 부동소수 오차가 그대로 노출되지 않게 한다. */
  private round(millimeters: number): number {
    return Math.round(millimeters * 10) / 10;
  }

  /** 종이 경계를 조금이라도 벗어나면 인쇄에서 잘리므로 경고 대상으로 본다. */
  private isOutsidePage(element: Element, page: PageSpec): boolean {
    const frame = element.frame;
    return frame.x < 0
      || frame.y < 0
      || frame.x + frame.width > page.widthMm()
      || frame.y + frame.height > page.heightMm();
  }

  /** 데이터 표는 발행 시 행이 채워지므로 정적 표만 빈 상태를 경고한다. */
  private isEmptyStaticTable(element: Element): boolean {
    return element instanceof TableElement
      && element.source instanceof StaticTableSource
      && element.source.resolveRows({}).length === 0;
  }

  /** 모든 경고가 같은 형태로 만들어지게 한다. */
  private warning(element: Element, message: string): TemplateIssue {
    return { elementId: element.id, severity: "warning", message };
  }
}
