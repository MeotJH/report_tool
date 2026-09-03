import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FontProvider } from "@report-tool/core";

/**
 * 폴더에서 글꼴 파일을 읽어 주는 참조 구현이다.
 *
 * **TTF만 쓴다.** OTF(CFF 아웃라인)는 임베딩 중 예외가 난다 — 이 저장소가 이미
 * 확인한 제약이다(CLAUDE.md).
 *
 * 파일 이름 규칙은 `<가족>-<Regular|Bold>.ttf` 하나뿐이다. 규칙을 늘리면 호스트가
 * 자기 파일을 어떤 이름으로 둬야 하는지 문서를 봐야 알게 된다.
 */
export class NodeFontProvider implements FontProvider {
  /** 굵은 글씨로 칠 기준이다. 발행 렌더러가 쓰는 두 굵기와 같아야 한다. */
  private static readonly BOLD_THRESHOLD = 700;

  /** 글꼴 파일이 모여 있는 폴더를 받는다. */
  constructor(private readonly fontDir: string) {}

  /** 가족과 굵기에 맞는 TTF 바이트를 준다. */
  async load(family: string, weight: number): Promise<Uint8Array> {
    const fileName = `${family}-${weight >= NodeFontProvider.BOLD_THRESHOLD ? "Bold" : "Regular"}.ttf`;
    try {
      return new Uint8Array(await readFile(join(this.fontDir, fileName)));
    } catch {
      // 어떤 이름으로 찾았는지 말한다. 그것이 없으면 호스트는 폴더만 뒤지게 된다.
      throw new Error(`글꼴 파일을 찾을 수 없다: ${fileName}`);
    }
  }
}
