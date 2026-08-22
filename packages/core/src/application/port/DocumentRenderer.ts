import { Template } from "../../domain/template/Template.js";

/** 미리보기와 법적 발행본의 렌더링 목적을 명시적으로 구분한다. */
export type RenderMode = "preview" | "authoritative";

/** PDF 구현 기술을 노출하지 않고 템플릿과 데이터를 바이트로 변환하는 계약을 정의한다. */
export interface DocumentRenderer {
  /** 애플리케이션이 pdf-lib를 몰라도 목적에 맞는 PDF를 요청할 수 있게 한다. */
  render(
    template: Template,
    data: unknown,
    mode: RenderMode,
  ): Promise<Uint8Array>;
}
