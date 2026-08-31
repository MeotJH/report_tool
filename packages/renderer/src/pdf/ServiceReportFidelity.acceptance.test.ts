import { DocumentLayout, TableCellText, TableRowHeights, type TextStyle } from "@report-tool/core";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { PdfFontBook } from "./PdfFontBook";

import {
  createServiceReportData,
  createServiceReportTemplate,
} from "./ServiceReportTestFixture";

// 원본 리포트가 실제로 임베딩한 글꼴이다. 다른 글꼴로 재면 줄이 달라진다.
const REGULAR_FONT = "C:/Windows/Fonts/malgun.ttf";
const BOLD_FONT = "C:/Windows/Fonts/malgunbd.ttf";

/**
 * 원본 `인팩 리포트.pdf`에서 잰 값이다. 재현본이 여기서 벗어나면 어긋난 것이다.
 *
 * 원본은 저장소에 두지 않는다(고객사 자료다). 그래서 "원본과 같은가"를 파일 비교로
 * 물을 수 없고, 원본에서 읽어 낸 사실을 여기 적어 두고 그것과 견준다.
 */
const ORIGINAL_PAGE_COUNT = 10;

/** 원본에서 처리 건 하나하나가 몇 쪽에서 시작하는지다. */
const ORIGINAL_TICKET_PAGE: Readonly<Record<string, number>> = {
  "23": 2, "22": 2, "21": 3, "20": 3, "19": 4, "18": 4, "17": 4, "16": 5,
  "15": 5, "14": 6, "13": 6, "12": 6, "11": 6, "10": 7, "9": 7, "8": 7,
  "7": 8, "6": 8, "5": 9, "4": 9, "3": 9, "2": 10, "1": 10,
};

/** 원본에서 각 구역 제목이 나오는 쪽이다(1부터 센다). */
const ORIGINAL_SECTION_PAGES: Readonly<Record<string, readonly number[]>> = {
  "업무별 통계(당월)": [2],
  "처리구분별 통계(당월)": [2],
  "처리내역 (상세)": [2, 3, 4, 5, 6, 7, 8, 9, 10],
  "미처리내역 (상세)": [10],
  "기타사항": [10],
};

/**
 * 재현본이 원본과 같은 자리에서 쪽을 넘기는지 확인한다.
 *
 * 쪽 수가 같은 것만으로는 부족하다. 같은 쪽 수라도 어느 건이 어느 쪽에서
 * 시작하는지가 다르면 담당자가 받은 문서와 다른 문서다. 그래서 건 하나하나의
 * 쪽을 확인한다.
 *
 * 이 값들이 흔들리는 순간이 곧 줄바꿈·행 높이·행 자르기 중 하나가 바뀐 순간이다.
 */
describe("서비스 리포트 재현 정확도", () => {
  let pages: ReturnType<DocumentLayout["compute"]>;

  beforeAll(async () => {
    pages = await layoutPages();
  });

  it("원본과 같은 쪽 수로 나온다", () => {
    expect(pages).toHaveLength(ORIGINAL_PAGE_COUNT);
  });

  it("처리 건 스물세 개가 원본과 같은 쪽에서 시작한다", () => {
    expect(ticketPages(pages)).toEqual(ORIGINAL_TICKET_PAGE);
  });

  it("구역 제목이 원본과 같은 쪽에 나온다", () => {
    for (const [title, expected] of Object.entries(ORIGINAL_SECTION_PAGES)) {
      expect(titlePages(pages, title), title).toEqual(expected);
    }
  });

  it("어느 건도 사라지지 않는다", () => {
    const drawn = pages.flatMap((page) => page.placements.flatMap(
      (placement) => (placement.table?.rows ?? [])
        .filter((row) => row.bodyIndex !== null && placement.element.id === "tickets")
        .map((row) => row.bodyIndex),
    ));

    expect(new Set(drawn).size).toBe(23);
  });
});

/** 발행과 같은 글꼴로 재야 화면의 줄 수와 발행본의 줄 수가 같아진다. */
async function layoutPages(): Promise<ReturnType<DocumentLayout["compute"]>> {
  const fonts = await embedFonts();
  const layout = new DocumentLayout(
    TableCellText.resolved(),
    TableRowHeights.content((style: TextStyle) => fonts.measurerFor(style)),
  );
  return layout.compute(createServiceReportTemplate(), createServiceReportData());
}

/** 발행 경로와 같은 파일을 임베딩해 같은 글자 폭을 얻는다. */
async function embedFonts(): Promise<PdfFontBook> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const regular = await document.embedFont(readFileSync(REGULAR_FONT), { subset: false });
  const bold = await document.embedFont(readFileSync(BOLD_FONT), { subset: false });
  return new PdfFontBook(new Map([
    [PdfFontBook.key("MalgunGothic", 400), regular],
    [PdfFontBook.key("MalgunGothic", 700), bold],
  ]));
}

/** 처리내역 표의 NO 값이 처음 나오는 쪽을 건별로 모은다. */
function ticketPages(
  pages: ReturnType<DocumentLayout["compute"]>,
): Record<string, number> {
  const found: Record<string, number> = {};
  pages.forEach((page, index) => {
    for (const placement of page.placements) {
      if (placement.element.id !== "tickets") continue;
      for (const row of placement.table?.rows ?? []) {
        // 열 이름 줄의 "NO"는 건 번호가 아니다.
        if (row.bodyIndex === null) continue;
        const no = row.cells[0]?.trim() ?? "";
        if (no !== "" && found[no] === undefined) found[no] = index + 1;
      }
    }
  });
  return found;
}

/** 그 문구가 나오는 쪽을 모은다. 이어지는 쪽에 따라가는지 확인하는 데 쓴다. */
function titlePages(
  pages: ReturnType<DocumentLayout["compute"]>,
  title: string,
): readonly number[] {
  return pages.flatMap((page, index) => (
    page.placements.some((placement) => (
      "content" in placement.element
      && (placement.element as { content: { value: string } }).content.value === title
    )) ? [index + 1] : []
  ));
}
