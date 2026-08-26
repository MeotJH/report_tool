import type { FontProvider } from "@report-tool/core";

/** 브라우저에 글꼴 파일을 등록하는 일만 분리해 검증 가능한 경계를 만든다. */
export interface FontFaceRegistrar {
  /** 파일 바이트를 한 가족·굵기로 등록한다. 실패하면 예외를 던진다. */
  register(family: string, weight: number, bytes: Uint8Array): Promise<void>;
}

/**
 * 발행본이 임베딩할 글꼴 **파일**을 편집 화면에도 등록해 같은 폭으로 재게 한다.
 *
 * 이것이 없으면 편집기는 `100px Pretendard`처럼 **가족 이름**으로 글자를 잰다.
 * 그 이름은 보는 사람 컴퓨터에 깔린 글꼴로 해석되며, 렌더러가 임베딩하는 파일이
 * 아니다. 실제로 같은 이름의 다른 파일이 잡혀 숫자 폭이 7% 어긋났다. 48mm 칸이면
 * 3.4mm이고, 줄바꿈이 한 어절씩 달라진다. 담당자 PC에 그 글꼴이 없으면 사람마다
 * 편집 화면이 달라진다.
 *
 * 그래서 등록할 때 **다른 이름**을 쓴다. 원래 이름 그대로 등록하면 시스템에 깔린
 * 같은 이름의 글꼴과 구분할 수 없어, 파일을 못 받았을 때 조용히 다른 글꼴로
 * 재고 있어도 아무도 모른다. 이름이 다르면 못 받은 사실이 드러난다.
 */
export class FontLibrary {
  /** 편집기가 화면에 쓰는 글꼴 이름은 호스트가 준 파일에서만 온다. */
  private static readonly PREFIX = "rt-embedded";

  /** 발행본이 임베딩하는 굵기와 같은 목록이어야 화면과 결과가 어긋나지 않는다. */
  private static readonly WEIGHTS: readonly number[] = [400, 700];

  private readonly fileBacked = new Set<string>();

  /** 브라우저가 없는 환경에서도 규칙만 검증할 수 있게 등록기를 주입받는다. */
  constructor(private readonly registrar: FontFaceRegistrar = new BrowserFontFaceRegistrar()) {}

  /** 템플릿이 쓰는 글꼴 이름을 화면에서 쓸 이름으로 바꾼다. */
  static internalName(family: string): string {
    return `${FontLibrary.PREFIX}-${family.replace(/[^A-Za-z0-9-]/g, "_")}`;
  }

  /**
   * 템플릿이 선언한 글꼴을 호스트에게 받아 모두 등록한다.
   *
   * 한 굵기라도 받지 못하면 그 가족은 파일 기반으로 치지 않는다. 보통 굵기만 받고
   * 굵은 글씨를 브라우저가 흉내 내면, 그 흉내의 폭은 발행본과 다르다.
   */
  async load(provider: FontProvider, families: readonly string[]): Promise<void> {
    for (const family of new Set(families)) {
      if (await this.loadFamily(provider, family)) this.fileBacked.add(family);
    }
  }

  /** 화면이 실제로 그리고 잴 때 쓸 글꼴 이름을 알려 준다. */
  familyFor(family: string): string {
    return this.fileBacked.has(family) ? FontLibrary.internalName(family) : family;
  }

  /** 이 가족을 발행본과 같은 파일로 재고 있는지 알려 준다. */
  isFileBacked(family: string): boolean {
    return this.fileBacked.has(family);
  }

  /**
   * 파일을 받지 못한 글꼴을 알려 준다. 화면이 이 사실을 반드시 표시해야 한다.
   *
   * 조용히 넘어가면 담당자는 화면에서 본 줄바꿈이 발행본과 같다고 믿는다.
   */
  missingFamilies(families: readonly string[]): readonly string[] {
    return [...new Set(families)].filter((family) => !this.fileBacked.has(family));
  }

  /** 한 가족의 모든 굵기를 등록하고 전부 성공했는지 알려 준다. */
  private async loadFamily(provider: FontProvider, family: string): Promise<boolean> {
    for (const weight of FontLibrary.WEIGHTS) {
      try {
        const bytes = await provider.load(family, weight);
        await this.registrar.register(FontLibrary.internalName(family), weight, bytes);
      } catch {
        return false;
      }
    }
    return true;
  }
}

/**
 * 실제 브라우저에 글꼴 파일을 등록한다.
 *
 * Shadow DOM 안에서도 글꼴은 문서 단위로 공유되므로 `document.fonts`에 넣는다.
 */
class BrowserFontFaceRegistrar implements FontFaceRegistrar {
  /** 파일 바이트를 FontFace로 만들어 문서에 등록한다. */
  async register(family: string, weight: number, bytes: Uint8Array): Promise<void> {
    if (typeof FontFace === "undefined") throw new Error("이 환경은 FontFace를 지원하지 않는다");
    const face = new FontFace(family, this.toArrayBuffer(bytes), { weight: String(weight) });
    await face.load();
    document.fonts.add(face);
  }

  /** 뷰가 가리키는 구간만 정확히 넘겨 다른 데이터가 섞이지 않게 한다. */
  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  }
}
