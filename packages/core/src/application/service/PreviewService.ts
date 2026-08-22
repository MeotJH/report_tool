import type { DataProvider } from "../port/DataProvider.js";
import type { DocumentRenderer } from "../port/DocumentRenderer.js";
import { Template } from "../../domain/template/Template.js";

/** 개인정보가 제거된 샘플 데이터로 미리보기 렌더링만 허용하는 유스케이스다. */
export class PreviewService {
  /** 렌더링 기술과 호스트 데이터 출처를 구체 구현 없이 조합한다. */
  constructor(
    private readonly renderer: DocumentRenderer,
    private readonly dataProvider: DataProvider,
  ) {}

  /** 실수로 권위 발행 모드를 호출하지 못하도록 모드를 preview로 고정한다. */
  async renderPreview(template: Template): Promise<Uint8Array> {
    const sampleData = await this.dataProvider.sample(template.id);
    return this.renderer.render(template, sampleData, "preview");
  }
}
