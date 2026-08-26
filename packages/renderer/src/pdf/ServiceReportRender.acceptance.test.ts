import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  Binding,
  BoundTableSource,
  type FontProvider,
  Frame,
  PageSpec,
  TableColumn,
  TableElement,
  Template,
  TextElement,
  TextStyle,
} from "@report-tool/core";
import { PDFDocument } from "pdf-lib";
import { PdfDocumentRenderer } from "./PdfDocumentRenderer";

const REGULAR_FONT = "node_modules/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf";
const BOLD_FONT = "node_modules/pretendard/dist/public/static/alternative/Pretendard-Bold.ttf";
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

  it("한 건도 없으면 한 쪽으로 끝난다", async () => {
    const renderer = new PdfDocumentRenderer(new TestFontProvider());

    const bytes = await renderer.render(createTemplate(), createData(0), "authoritative");

    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});

/** 제목과 처리내역 표만 둔 최소 리포트 템플릿을 만든다. */
function createTemplate(): Template {
  const cellStyle = new TextStyle("Pretendard", 8);
  const headerStyle = new TextStyle("Pretendard", 8, { weight: 700 });
  return new Template({
    id: "service-report",
    name: "월간 서비스 리포트",
    version: 1,
    status: "draft",
    page: new PageSpec("A4", "portrait", [20, 15, 20, 15]),
    fonts: ["Pretendard"],
    elements: [
      new TextElement(
        "title", new Frame(15, 15, 180, 10), 1, false,
        { kind: "literal", value: "처리내역 (계)" },
        new TextStyle("Pretendard", 12, { weight: 700 }),
      ),
      new TextElement(
        "footer", new Frame(160, 280, 35, 6), 9, false,
        { kind: "literal", value: "{{page:00}} / {{pages:00}}" },
        new TextStyle("Pretendard", 9), false, 0, true,
      ),
      new TableElement(
        "tickets", new Frame(15, 30, 180, 60), 2, false,
        new BoundTableSource(new Binding("tickets")),
        [
          new TableColumn("no", "NO", "{{row.no}}", 15, "center", null),
          new TableColumn("requester", "요청자", "{{row.requester}}", 30, "center", null),
          new TableColumn("body", "요청내용", "{{row.body}}", 135, "left", null),
        ],
        6, headerStyle, cellStyle, true, "clip",
      ),
    ],
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  });
}

/** 실제 리포트와 비슷한 길이의 요청내용을 가진 처리 건을 만든다. */
function createData(count: number): unknown {
  return {
    tickets: Array.from({ length: count }, (_value, index) => ({
      no: String(index + 1),
      requester: "김담당",
      body: `안녕하십니까 인사팀 담당 매니저입니다. ${index + 1}번 건으로 문의드립니다. `
        + "근태관리 화면에서 반차를 선택하면 시간 입력칸이 활성화되지 않아 신청 자체가 "
        + "되지 않습니다. 동일 증상이 다른 담당자 계정에서도 재현되는 것을 확인했습니다. "
        + "확인 후 회신 부탁드립니다. 감사합니다.",
    })),
  };
}

/** 테스트 환경의 실제 Pretendard TTF를 렌더러 포트로 공급한다. */
class TestFontProvider implements FontProvider {
  /** 굵기별 검증된 TTF를 읽어 실제 한글 임베딩 경로를 실행한다. */
  async load(_family: string, weight: number): Promise<Uint8Array> {
    const path = weight >= 700 ? BOLD_FONT : REGULAR_FONT;
    return new Uint8Array(readFileSync(path));
  }
}
