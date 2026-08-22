import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type FontProvider } from "@report-tool/core";
import { PDFDocument } from "pdf-lib";
import { createPayslipData, createPayslipTemplate } from "./PayslipTestFixture";
import { PdfDocumentRenderer } from "./PdfDocumentRenderer";

const REGULAR_FONT = "node_modules/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf";
const BOLD_FONT = "node_modules/pretendard/dist/public/static/alternative/Pretendard-Bold.ttf";
const OUTPUT_PATH = "apps/poc/generated-payslip.pdf";

describe("급여명세서 PDF 인수 테스트", () => {
  it("참고 양식 데이터로 열 수 있는 A4 한 페이지 PDF를 생성한다", async () => {
    const renderer = new PdfDocumentRenderer(new TestFontProvider());

    const bytes = await renderer.render(
      createPayslipTemplate(),
      createPayslipData(),
      "authoritative",
    );
    writeFileSync(OUTPUT_PATH, bytes);
    const pdf = await PDFDocument.load(bytes);
    const page = pdf.getPage(0);

    expect(pdf.getPageCount()).toBe(1);
    expect(page.getWidth()).toBeCloseTo(210 * 72 / 25.4, 1);
    expect(page.getHeight()).toBeCloseTo(297 * 72 / 25.4, 1);
    expect(bytes.length).toBeGreaterThan(10_000);
  });
});

/** 테스트 환경의 실제 Pretendard TTF를 렌더러 포트로 공급한다. */
class TestFontProvider implements FontProvider {
  /** 굵기별 검증된 TTF를 읽어 실제 한글 임베딩 경로를 실행한다. */
  async load(_family: string, weight: number): Promise<Uint8Array> {
    const path = weight >= 700 ? BOLD_FONT : REGULAR_FONT;
    return new Uint8Array(readFileSync(path));
  }
}
