import { Buffer } from "node:buffer";
import subsetFont from "subset-font";

/** 검증된 harfbuzz 경로로 사용 글리프만 남겨 한글 PDF의 폰트 용량을 줄인다. */
export class FontSubsetter {
  /** 빈 문서는 그대로 두고 나머지는 TrueType 형식으로 미리 서브셋한다. */
  async subset(
    rawFontBytes: Uint8Array,
    usedChars: string,
  ): Promise<Uint8Array> {
    if (usedChars === "") {
      return rawFontBytes;
    }

    const compatibleBytes = Buffer.from(rawFontBytes);
    return subsetFont(compatibleBytes, usedChars, { targetFormat: "truetype" });
  }
}
