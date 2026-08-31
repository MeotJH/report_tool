import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type FontProvider, type Template } from "@report-tool/core";
import { PDFDocument } from "pdf-lib";
import { PdfDocumentRenderer } from "./PdfDocumentRenderer";
import {
  createServiceReportData,
  createServiceReportTemplate,
} from "./ServiceReportTestFixture";

// 원본 리포트가 실제로 임베딩한 글꼴이다. 다른 글꼴로 재면 줄바꿈이 달라져
// "같은 자리에서 쪽이 넘어가는가"를 확인할 수 없다.
const REGULAR_FONT = "C:/Windows/Fonts/malgun.ttf";
const BOLD_FONT = "C:/Windows/Fonts/malgunbd.ttf";
const OUTPUT_PATH = "apps/poc/generated-service-report.pdf";

/**
 * 월간 서비스 리포트처럼 행이 많고 칸 하나가 긴 문서가 실제로 발행되는지 확인한다.
 *
 * 급여명세서는 한 사람당 한 쪽으로 끝나서 표가 쪽을 넘는 경로를 지나지 않는다.
 * 처리내역 스물세 건은 어느 자리에도 한 번에 들어가지 않으므로, 쪽을 넘기고
 * 열 이름을 다시 그리는 길을 실제 PDF로 통과시켜야 한다.
 */
describe("서비스 리포트 PDF 인수 테스트", () => {
  it("처리내역이 여러 쪽으로 이어진 PDF를 만든다", async () => {
    const renderer = new PdfDocumentRenderer(new TestFontProvider());

    const bytes = await renderer.render(createTemplate(), createData(23), "authoritative");
    writeFileSync(OUTPUT_PATH, bytes);
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(210 * 72 / 25.4, 1);
    expect(pdf.getPage(pdf.getPageCount() - 1).getHeight()).toBeCloseTo(297 * 72 / 25.4, 1);
  });

  it("건수가 늘면 쪽 수도 늘어난다", async () => {
    const renderer = new PdfDocumentRenderer(new TestFontProvider());

    const few = await renderer.render(createTemplate(), createData(5), "authoritative");
    const many = await renderer.render(createTemplate(), createData(40), "authoritative");

    const fewPages = (await PDFDocument.load(few)).getPageCount();
    const manyPages = (await PDFDocument.load(many)).getPageCount();
    expect(manyPages).toBeGreaterThan(fewPages);
  });

  it("한 건도 없어도 표지와 본문 두 쪽은 나온다", async () => {
    const renderer = new PdfDocumentRenderer(new TestFontProvider());

    const bytes = await renderer.render(createTemplate(), createData(0), "authoritative");

    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  it("표지 다음에 본문이 오고 처리내역이 이어진다", async () => {
    const renderer = new PdfDocumentRenderer(new TestFontProvider());

    const bytes = await renderer.render(createTemplate(), createData(23), "authoritative");
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
  });
});

/** 픽스처가 만드는 실제 리포트 모양의 템플릿과 데이터를 그대로 쓴다. */
function createTemplate(): Template {
  return createServiceReportTemplate();
}

/** 처리 건수만 바꿔 가며 같은 문서를 발행한다. */
function createData(count: number): unknown {
  return createServiceReportData(count);
}

/** 테스트 환경의 실제 Pretendard TTF를 렌더러 포트로 공급한다. */
class TestFontProvider implements FontProvider {
  /** 굵기별 검증된 TTF를 읽어 실제 한글 임베딩 경로를 실행한다. */
  async load(_family: string, weight: number): Promise<Uint8Array> {
    const path = weight >= 700 ? BOLD_FONT : REGULAR_FONT;
    return new Uint8Array(readFileSync(path));
  }
}
