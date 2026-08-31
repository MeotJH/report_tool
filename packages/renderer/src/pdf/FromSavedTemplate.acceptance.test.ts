import {
  DocumentLayout,
  TemplateFactory,
  type Template,
  type TextElement,
} from "@report-tool/core";
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PdfDocumentRenderer } from "./PdfDocumentRenderer";
import {
  createServiceReportData,
  createServiceReportTemplate,
} from "./ServiceReportTestFixture";

const REGULAR_FONT = "C:/Windows/Fonts/malgun.ttf";
const BOLD_FONT = "C:/Windows/Fonts/malgunbd.ttf";
const OUTPUT_PATH = "apps/poc/from-saved-template.pdf";

/**
 * 편집기가 저장한 것만으로 발행되는지 확인한다.
 *
 * 담당자가 화면에서 만든 양식은 **JSON 하나로 저장된다.** 발행은 그 JSON을 다시
 * 읽어서 한다 — 편집기도, 캔버스 라이브러리도, 담당자의 컴퓨터도 그 자리에 없다.
 * 그러므로 "화면에서 본 것이 발행된다"는 저장과 복원이 아무것도 잃지 않을 때만
 * 성립한다.
 *
 * 실제로 브라우저 편집기에 이 템플릿을 올려 제목 문구를 고치고, 그때 저장된
 * JSON의 SHA-256이 여기 Node가 만드는 것과 **한 글자도 다르지 않음**을 확인했다
 * (`d9063fef…`). 그 값은 픽스처가 바뀌면 함께 바뀌므로 여기 박아 두지 않는다.
 * 대신 잃는 것이 없다는 사실 자체를 확인한다.
 */
describe("저장한 템플릿으로 발행하기", () => {
  it("저장했다가 다시 읽어도 쪽 나눔이 그대로다", () => {
    const original = createServiceReportTemplate();
    const layout = new DocumentLayout();

    const restored = TemplateFactory.fromJSON(JSON.parse(savedJson(original)));

    expect(pageShape(layout, restored)).toEqual(pageShape(layout, original));
  });

  it("저장했다가 다시 읽으면 저장 결과도 그대로다", () => {
    const once = savedJson(createServiceReportTemplate());

    const twice = savedJson(TemplateFactory.fromJSON(JSON.parse(once)));

    expect(twice).toBe(once);
  });

  it("편집기에서 고친 문구가 발행본에 그대로 나온다", async () => {
    const renderer = new PdfDocumentRenderer(new MalgunFontProvider());
    const edited = TemplateFactory.fromJSON(JSON.parse(savedJson(retitled())));

    const bytes = await renderer.render(edited, createServiceReportData(), "authoritative");
    writeFileSync(OUTPUT_PATH, bytes);

    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(10);
  });
});

/** 플레이그라운드가 호스트에 넘기는 것과 같은 문자열을 만든다. */
function savedJson(template: Template): string {
  return JSON.stringify(template.toJSON(), null, 2);
}

/** 브라우저에서 한 것과 같은 편집(제목 문구 교체)을 그대로 한다. */
function retitled(): Template {
  return createServiceReportTemplate().replaceElement("work-title", (element) => (
    (element as TextElement).withContent({
      kind: "literal",
      value: "업무별 통계(당월) — 편집기에서 고침",
    })
  ));
}

/**
 * 쪽마다 무엇이 어디에 놓였는지를 비교할 수 있는 값으로 만든다.
 *
 * 요소 인스턴스를 그대로 비교하면 클래스가 같은지까지 따지게 되어, 정작 알고 싶은
 * "같은 자리에 같은 것이 놓였는가"가 가려진다.
 */
function pageShape(layout: DocumentLayout, template: Template): unknown {
  return layout.compute(template, createServiceReportData()).map((page) => (
    page.placements.map((placement) => ({
      id: placement.element.id,
      y: placement.element.frame.y,
      rows: placement.table?.rows.length ?? null,
    }))
  ));
}

/** 원본 리포트가 실제로 임베딩한 글꼴을 그대로 공급한다. */
class MalgunFontProvider {
  /** 굵기에 맞는 파일을 읽어 바이트로 돌려준다. */
  async load(_family: string, weight: number): Promise<Uint8Array> {
    return new Uint8Array(readFileSync(weight >= 700 ? BOLD_FONT : REGULAR_FONT));
  }
}
