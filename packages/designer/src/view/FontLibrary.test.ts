import type { FontProvider } from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { FontLibrary, type FontFaceRegistrar } from "./FontLibrary.js";

/** 등록된 (가족, 굵기)를 기록해 두는 등록기다. */
class RecordingRegistrar implements FontFaceRegistrar {
  public readonly registered: string[] = [];

  /** 실패시킬 굵기를 지정해 일부만 받은 상황을 만든다. */
  constructor(private readonly failWeight: number | null = null) {}

  /** 지정한 굵기에서만 실패하고 나머지는 기록한다. */
  async register(family: string, weight: number): Promise<void> {
    if (weight === this.failWeight) throw new Error("등록 실패");
    this.registered.push(`${family}:${weight}`);
  }
}

/** 호스트가 글꼴 파일을 주는 상황을 흉내 낸다. */
class StubFontProvider implements FontProvider {
  /** 없는 글꼴을 요청하면 호스트처럼 예외를 던진다. */
  constructor(private readonly known: readonly string[] = ["Pretendard"]) {}

  /** 아는 글꼴에만 바이트를 준다. */
  async load(family: string): Promise<Uint8Array> {
    if (!this.known.includes(family)) throw new Error(`${family} 없음`);
    return new Uint8Array([0, 1, 2]);
  }
}

describe("FontLibrary", () => {
  it("받은 글꼴은 화면 전용 이름으로 등록한다", async () => {
    const registrar = new RecordingRegistrar();
    const library = new FontLibrary(registrar);

    await library.load(new StubFontProvider(), ["Pretendard"]);

    expect(registrar.registered).toEqual([
      "rt-embedded-Pretendard:400",
      "rt-embedded-Pretendard:700",
    ]);
  });

  it("받은 글꼴은 시스템 글꼴과 구분되는 이름으로 그린다", async () => {
    const library = new FontLibrary(new RecordingRegistrar());

    await library.load(new StubFontProvider(), ["Pretendard"]);

    expect(library.familyFor("Pretendard")).toBe("rt-embedded-Pretendard");
    expect(library.isFileBacked("Pretendard")).toBe(true);
  });

  it("받지 못한 글꼴은 원래 이름 그대로 두고 빠진 것으로 알린다", async () => {
    const library = new FontLibrary(new RecordingRegistrar());

    await library.load(new StubFontProvider(["Pretendard"]), ["Pretendard", "NotoSansKR"]);

    expect(library.familyFor("NotoSansKR")).toBe("NotoSansKR");
    expect(library.missingFamilies(["Pretendard", "NotoSansKR"])).toEqual(["NotoSansKR"]);
  });

  it("굵기 하나라도 받지 못하면 그 가족은 파일 기반이 아니다", async () => {
    // 보통 굵기만 받고 굵은 글씨를 브라우저가 흉내 내면 그 폭은 발행본과 다르다.
    const library = new FontLibrary(new RecordingRegistrar(700));

    await library.load(new StubFontProvider(), ["Pretendard"]);

    expect(library.isFileBacked("Pretendard")).toBe(false);
    expect(library.missingFamilies(["Pretendard"])).toEqual(["Pretendard"]);
  });

  it("아무것도 받지 않은 상태에서는 모든 글꼴이 빠진 것으로 나온다", () => {
    const library = new FontLibrary(new RecordingRegistrar());

    expect(library.missingFamilies(["Pretendard"])).toEqual(["Pretendard"]);
    expect(library.familyFor("Pretendard")).toBe("Pretendard");
  });

  it("같은 글꼴을 두 번 선언해도 한 번만 등록한다", async () => {
    const registrar = new RecordingRegistrar();
    const library = new FontLibrary(registrar);

    await library.load(new StubFontProvider(), ["Pretendard", "Pretendard"]);

    expect(registrar.registered).toHaveLength(2);
  });
});
