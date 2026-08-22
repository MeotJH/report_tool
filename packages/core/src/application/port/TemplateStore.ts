import { Template } from "../../domain/template/Template.js";

/** 저장 기술과 무관하게 템플릿 버전을 조회하고 보관하는 계약을 정의한다. */
export interface TemplateStore {
  /** 애플리케이션 서비스가 저장소 종류를 몰라도 특정 템플릿 버전을 가져오게 한다. */
  get(id: string, version?: number): Promise<Template>;

  /** 템플릿 저장 방식이 바뀌어도 발행 흐름을 수정하지 않게 한다. */
  save(template: Template): Promise<void>;

  /** 저장소가 관리하는 발행 표시를 구체적인 DB 명령으로부터 분리한다. */
  publish(id: string, version: number): Promise<void>;

  /** 전체 템플릿을 노출하지 않고 버전 선택에 필요한 정보만 제공한다. */
  listVersions(
    id: string,
  ): Promise<ReadonlyArray<Pick<Template, "id" | "version" | "status" | "updatedAt">>>;
}
