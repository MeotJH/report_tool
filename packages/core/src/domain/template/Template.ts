import { Element } from "../element/Element.js";
import { ElementFactory } from "../element/ElementFactory.js";
import { PageSpec } from "../value/PageSpec.js";
import { TemplateVariable } from "./TemplateVariable.js";

/** 템플릿이 편집·발행·보관 중 어느 상태인지 명확하게 제한한다. */
export type TemplateStatus = "draft" | "published" | "archived";

/** 많은 템플릿 속성을 이름 기반으로 전달해 생성자의 의미를 읽기 쉽게 유지한다. */
export interface TemplateOptions {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly status: TemplateStatus;
  readonly page: PageSpec;
  readonly fonts: readonly string[];
  readonly elements: readonly Element[];
  readonly variables?: readonly TemplateVariable[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * 문서 요소의 버전별 모음을 관리하고 발행된 내용이 변경되지 않도록 상태 규칙을 강제한다.
 */
export class Template {
  public readonly schemaVersion = 2 as const;
  public readonly id: string;
  public readonly name: string;
  public readonly version: number;
  public readonly status: TemplateStatus;
  public readonly page: PageSpec;
  public readonly fonts: readonly string[];
  public readonly createdAt: string;
  public readonly updatedAt: string;
  public readonly variables: readonly TemplateVariable[];
  private readonly elements: readonly Element[];

  /** 외부 배열 변경이 저장된 템플릿 상태를 훼손하지 않도록 목록을 복사해 보관한다. */
  constructor(options: TemplateOptions) {
    this.id = options.id;
    this.name = options.name;
    this.version = options.version;
    this.status = options.status;
    this.page = options.page;
    this.fonts = [...options.fonts];
    this.elements = [...options.elements];
    this.variables = [...options.variables ?? []];
    this.createdAt = options.createdAt;
    this.updatedAt = options.updatedAt;
  }

  /** 호출자가 내부 요소 배열을 직접 변경하지 못하도록 복사본을 제공한다. */
  getElements(): readonly Element[] {
    return [...this.elements];
  }

  /**
   * 사용자가 만든 쪽이 몇 장인지 알려 준다. 요소가 없어도 한 장이다.
   *
   * 쪽을 따로 저장하지 않고 요소가 가진 쪽 번호로 센다. 두 곳에 저장하면 요소를
   * 지웠을 때 빈 쪽이 남을지 사라질지가 두 값 중 무엇을 믿느냐에 따라 갈린다.
   * 발행본의 쪽 수는 여기에 데이터가 더해져 `DocumentLayout`이 따로 정한다.
   */
  pageCount(): number {
    return this.elements.reduce(
      (count, element) => Math.max(count, element.pageIndex + 1),
      1,
    );
  }

  /** 초안 원본을 보존하면서 요소가 추가된 새 편집 상태를 만든다. */
  addElement(element: Element): Template {
    this.assertDraft();
    return this.copy({ elements: [...this.elements, element] });
  }

  /** 초안 원본을 보존하면서 지정한 요소가 제거된 새 편집 상태를 만든다. */
  removeElement(id: string): Template {
    this.assertDraft();
    const elements = this.elements.filter((element) => element.id !== id);
    return this.copy({ elements });
  }

  /** 편집 명령이 특정 요소만 불변 방식으로 교체할 수 있게 한다. */
  replaceElement(id: string, updater: (element: Element) => Element): Template {
    this.assertDraft();
    const target = this.elements.find((element) => element.id === id);
    if (target === undefined) {
      throw new Error(`요소 ${id}을 찾을 수 없다`);
    }

    const elements = this.elements.map((element) => (
      element.id === id ? updater(element) : element
    ));
    return this.copy({ elements });
  }

  /** 발행 전 내용은 유지하면서 수정 불가능한 새 상태로 전환한다. */
  publish(): Template {
    this.assertDraft();
    return this.copy({ status: "published" });
  }

  /**
   * 사용자가 정의한 변수 목록을 교체한 새 편집 상태를 만든다.
   *
   * 변수는 문서가 요구하는 데이터의 계약이므로 요소와 같은 초안 규칙을 따른다.
   */
  withVariables(variables: readonly TemplateVariable[]): Template {
    this.assertDraft();
    return this.copy({ variables });
  }

  /** 용지·방향·여백 변경도 요소 편집과 같은 초안 규칙을 따르게 한다. */
  withPage(page: PageSpec): Template {
    this.assertDraft();
    return this.copy({ page });
  }

  /** 초안 원본을 보존하면서 이름이 변경된 새 편집 상태를 만든다. */
  rename(newName: string): Template {
    this.assertDraft();
    return this.copy({ name: newName });
  }

  /** 발행된 내용을 보존하면서 편집 가능한 다음 버전을 시작한다. */
  createNextVersion(): Template {
    return this.copy({
      version: this.version + 1,
      status: "draft",
      elements: [...this.elements],
    });
  }

  /**
   * 편집 결과 전체를 호스트가 저장할 수 있는 순수 데이터로 변환한다.
   *
   * 캔버스 라이브러리의 직렬화 결과를 저장하지 않는다는 결정에 따라, 저장 형식은
   * 이 메서드가 만드는 구조가 유일한 근거다. schemaVersion을 함께 담아
   * 나중에 형식이 바뀌었을 때 마이그레이션 판단 근거를 남긴다.
   */
  toJSON(): Record<string, unknown> {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      name: this.name,
      version: this.version,
      status: this.status,
      page: this.page.toJSON(),
      fonts: [...this.fonts],
      variables: this.variables.map((variable) => variable.toJSON()),
      elements: this.elements.map((element) => ElementFactory.toJSON(element)),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /** 여러 변경 연산이 같은 복사 규칙을 사용하도록 새 인스턴스 생성을 모은다. */
  private copy(changes: Partial<TemplateOptions>): Template {
    return new Template({
      id: changes.id ?? this.id,
      name: changes.name ?? this.name,
      version: changes.version ?? this.version,
      status: changes.status ?? this.status,
      page: changes.page ?? this.page,
      fonts: changes.fonts ?? this.fonts,
      elements: changes.elements ?? this.elements,
      variables: changes.variables ?? this.variables,
      createdAt: changes.createdAt ?? this.createdAt,
      updatedAt: changes.updatedAt ?? this.updatedAt,
    });
  }

  /** 발행·보관된 버전이 편집 연산으로 변경되는 것을 한곳에서 차단한다. */
  private assertDraft(): void {
    if (this.status !== "draft") {
      throw new Error(
        "발행된 템플릿은 수정할 수 없다. createNextVersion()으로 새 버전을 만들어라",
      );
    }
  }
}
