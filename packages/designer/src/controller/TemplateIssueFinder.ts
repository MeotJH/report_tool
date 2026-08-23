import {
  ImageElement,
  SignatureElement,
  StaticTableSource,
  TableElement,
  TemplateReferences,
  TemplateValidator,
  type Element,
  type PageSpec,
  type Template,
} from "@report-tool/core";
import type { PaletteEntry } from "./PaletteEntry.js";

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

  /**
   * 편집기가 아는 데이터 목록을 받아 참조가 실제로 존재하는지도 볼 수 있게 한다.
   *
   * core는 호스트가 어떤 필드를 제공하는지 모른다. 그 지식은 편집기에만 있으므로
   * "어디에도 없는 경로를 참조한다"는 판단은 이 클래스가 한다.
   */
  constructor(private readonly entries: readonly PaletteEntry[] = []) {}

  /** 화면이 요소별 배지와 문제 목록을 같은 결과로 그리게 한다. */
  find(template: Template): readonly TemplateIssue[] {
    const errors = this.validator.validate(template).map((error) => ({
      elementId: error.elementId,
      severity: "error" as const,
      message: error.message,
    }));
    const warnings = template.getElements()
      .flatMap((element) => this.warningsFor(element, template.page));
    return [...errors, ...warnings, ...this.findUnknownReferences(template)];
  }

  /**
   * 어디에도 정의되지 않은 데이터 경로를 참조하는 요소를 찾는다.
   *
   * 호스트 목록에도 없고 템플릿 선언에도 없는 경로는 오타이거나 지운 변수의
   * 흔적이다. 발행하면 그 자리는 빈칸으로 나간다.
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
    warnings.push(...this.overflowingColumnWarning(element));
    return warnings;
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
