import { TemplateFactory } from "@report-tool/core";
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PdfDocumentRenderer } from "./PdfDocumentRenderer";
import { createServiceReportData } from "./ServiceReportTestFixture";

const REGULAR_FONT = "C:/Windows/Fonts/malgun.ttf";
const BOLD_FONT = "C:/Windows/Fonts/malgunbd.ttf";
const SAVED_TEMPLATE = "apps/poc/blank-built/template.json";
const OUTPUT_PATH = "apps/poc/blank-built/blank-built.pdf";

/**
 * 편집기를 백지에서 열어 만든 템플릿이 그것만으로 발행되는지 확인한다.
 *
 * 여기 쓰는 JSON은 코드가 만든 픽스처가 아니다. `?doc=blank`로 편집기를 열어
 * 도구 모음과 속성 패널만으로 만든 결과이고, `Designer.getTemplate().toJSON()`이
 * 그대로 저장한 것이다. 그러므로 이 테스트가 도는 것은 **화면에서 만든 것이
 * 발행된다**는 뜻이다.
 *
 * 아직 표지 문구 넷까지다. 나머지 구역은 같은 방식으로 이어 붙인다 — 이 파일이
 * 그때마다 무엇이 실제로 발행되는지 말해 준다.
 */
describe("백지에서 만든 템플릿으로 발행하기", () => {
  it("저장된 JSON만으로 PDF가 나온다", async () => {
    const renderer = new PdfDocumentRenderer(new MalgunFontProvider());
    const template = TemplateFactory.fromJSON(savedTemplate());

    const bytes = await renderer.render(template, createServiceReportData(), "authoritative");
    writeFileSync(OUTPUT_PATH, bytes);

    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("편집기가 저장한 값이 그대로 복원된다", () => {
    const template = TemplateFactory.fromJSON(savedTemplate());

    expect(JSON.parse(JSON.stringify(template.toJSON()))).toEqual(savedTemplate());
  });

  it("표지 문구가 원본 리포트와 같은 자리·같은 표현이다", () => {
    const template = TemplateFactory.fromJSON(savedTemplate());

    const title = template.getElements()[0];
    expect(title?.frame).toMatchObject({ x: 10, y: 47.87, width: 190, height: 18.14 });
  });

  it("원본과 같은 글꼴로 재고 임베딩한다", () => {
    expect(TemplateFactory.fromJSON(savedTemplate()).fonts).toContain("MalgunGothic");
  });
});

/** 편집기가 저장해 둔 템플릿을 읽는다. */
function savedTemplate(): Record<string, unknown> {
  return JSON.parse(readFileSync(SAVED_TEMPLATE, "utf-8")) as Record<string, unknown>;
}

/** 발행본이 임베딩할 글꼴 파일을 파일 시스템에서 공급한다. */
class MalgunFontProvider {
  /** 굵기에 맞는 TTF 파일을 바이트로 돌려준다. */
  async load(_family: string, weight: number): Promise<Uint8Array> {
    return new Uint8Array(readFileSync(weight >= 700 ? BOLD_FONT : REGULAR_FONT));
  }
}
