import type { TemplateStore } from "../port/TemplateStore.js";
import { Template } from "../../domain/template/Template.js";
import { TemplateValidator } from "../../domain/template/TemplateValidator.js";

/** 템플릿 저장과 발행을 조율하며 발행 직전의 구조 검증을 빠뜨리지 않게 한다. */
export class TemplateService {
  /** 저장 기술과 검증 규칙을 교체 가능하게 두면서 유스케이스에서 함께 사용한다. */
  constructor(
    private readonly store: TemplateStore,
    private readonly validator: TemplateValidator,
  ) {}

  /** 작업 중인 불완전한 초안도 자유롭게 이어서 편집할 수 있도록 검증 없이 저장한다. */
  async save(template: Template): Promise<void> {
    await this.store.save(template);
  }

  /** 잘못된 구조가 실제 발행 상태로 넘어가지 않도록 저장소 호출 직전에 검증한다. */
  async publish(id: string, version: number): Promise<void> {
    const template = await this.store.get(id, version);
    const errors = this.validator.validate(template);
    if (errors.length > 0) {
      throw new Error(errors.map((error) => error.message).join("; "));
    }

    await this.store.publish(id, version);
  }
}
