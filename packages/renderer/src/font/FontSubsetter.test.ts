import { readFileSync } from "node:fs";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { FontSubsetter } from "./FontSubsetter";

const FONT_PATH = "node_modules/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf";

describe("FontSubsetter", () => {
  it("사용 문자가 없으면 불필요한 처리 없이 원본 바이트를 반환한다", async () => {
    const original = new Uint8Array([1, 2, 3]);

    const result = await new FontSubsetter().subset(original, "");

    expect(result).toBe(original);
  });

  it("실제 한글 TTF를 사용 문자만 포함한 더 작은 TTF로 만든다", async () => {
    const original = new Uint8Array(readFileSync(FONT_PATH));

    const result = await new FontSubsetter().subset(
      original,
      "임금명세서 가나다 ISU-20194",
    );

    expect(result.length).toBeLessThan(original.length);
    expect(result.length).toBeGreaterThan(0);
  });

  it("서브셋 전후 하이픈 문자열의 advance width를 동일하게 보존한다", async () => {
    const text = "ISU-20194";
    const original = new Uint8Array(readFileSync(FONT_PATH));
    const subset = await new FontSubsetter().subset(original, text);

    const originalWidth = await measureTextWidth(original, text);
    const subsetWidth = await measureTextWidth(subset, text);

    expect(subsetWidth).toBeCloseTo(originalWidth, 5);
  });
});

/** 같은 pdf-lib 경로로 폰트를 임베딩해 특정 문구의 실제 advance width를 측정한다. */
async function measureTextWidth(fontBytes: Uint8Array, text: string): Promise<number> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: false });
  return font.widthOfTextAtSize(text, 10);
}
