import { describe, expect, it, vi } from "vitest";
import type { DataProvider } from "../port/DataProvider";
import type { DocumentRenderer } from "../port/DocumentRenderer";
import { Template } from "../../domain/template/Template";
import { PageSpec } from "../../domain/value/PageSpec";
import { PreviewService } from "./PreviewService";

describe("PreviewService", () => {
  it("샘플 데이터로 preview 모드 렌더링만 요청한다", async () => {
    const template = createTemplate();
    const sampleData = { employee: { name: "마스킹" } };
    const render = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const renderer: DocumentRenderer = { render };
    const dataProvider: DataProvider = {
      fields: vi.fn(async () => ({})),
      sample: vi.fn(async () => sampleData),
      resolve: vi.fn(async () => ({})),
    };
    const service = new PreviewService(renderer, dataProvider);

    const bytes = await service.renderPreview(template);

    expect(render).toHaveBeenCalledExactlyOnceWith(template, sampleData, "preview");
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  });
});

/** 미리보기 조율만 검증하도록 최소한의 템플릿을 제공한다. */
function createTemplate(): Template {
  return new Template({
    id: "payslip",
    name: "급여명세서",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [10, 10, 10, 10]),
    fonts: [],
    elements: [],
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  });
}
