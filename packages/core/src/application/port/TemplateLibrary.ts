import type { Template } from "../../domain/template/Template.js";

/** 문서 목록에서 하나를 고르는 데 필요한 만큼만 담는다. */
export interface TemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
}

/**
 * 편집기가 만든 양식을 호스트가 어디에 보관하든 같은 방식으로 넣고 꺼내게 한다.
 *
 * 라이브러리는 I/O를 하지 않는다. 급여 데이터가 고객사 밖으로 나가면 안 되므로,
 * 어디에 저장할지는 호스트만 정할 수 있다. 편집기가 아는 것은 "넣는다·목록을
 * 본다·꺼낸다" 셋뿐이다.
 *
 * 발행 흐름이 쓰는 `TemplateStore`와 나눠 둔 이유는 다루는 단위가 다르기
 * 때문이다. 그쪽은 **한 양식의 여러 버전**을 다루고(발행 표시·버전 목록),
 * 여기는 **여러 양식 중 하나**를 다룬다. 편집기에 버전 승격을 구현하게 하면
 * 저장 버튼 하나를 붙이려는 호스트가 발행 절차까지 만들어야 한다.
 */
export interface TemplateLibrary {
  /** 열 수 있는 문서를 최근에 고친 것부터 보여 준다. */
  list(): Promise<readonly TemplateSummary[]>;

  /** 목록에서 고른 문서를 편집할 수 있는 형태로 꺼낸다. */
  load(id: string): Promise<Template>;

  /** 지금 편집 중인 문서를 같은 식별자 자리에 덮어 넣는다. */
  save(template: Template): Promise<void>;
}
