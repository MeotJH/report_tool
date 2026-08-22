import {
  ImageElement,
  SignatureElement,
  StaticTableSource,
  TableElement,
  TemplateValidator,
  type Element,
  type PageSpec,
  type Template,
} from "@report-tool/core";

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

  /** 화면이 요소별 배지와 문제 목록을 같은 결과로 그리게 한다. */
  find(template: Template): readonly TemplateIssue[] {
    const errors = this.validator.validate(template).map((error) => ({
      elementId: error.elementId,
      severity: "error" as const,
      message: error.message,
    }));
    const warnings = template.getElements()
      .flatMap((element) => this.warningsFor(element, template.page));
    return [...errors, ...warnings];
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
    return warnings;
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
