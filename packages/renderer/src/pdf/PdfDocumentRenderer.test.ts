import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  Binding,
  Frame,
  type FontProvider,
  ImageElement,
  type ImageProvider,
} from "@report-tool/core";
import { createPayslipTemplate } from "./PayslipTestFixture";
import { PdfDocumentRenderer } from "./PdfDocumentRenderer";

describe("PdfDocumentRenderer", () => {
  it("브라우저에서는 법적 발행본 렌더링을 거부한다", async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    const renderer = new PdfDocumentRenderer(createUnusedFontProvider());

    try {
      await expect(renderer.render(createPayslipTemplate(), {}, "authoritative"))
        .rejects.toThrow("발행본 렌더는 서버에서만 허용된다");
    } finally {
      restoreWindow(originalWindow);
    }
  });

  it("브라우저 미리보기도 서버 렌더링을 사용하도록 직접 실행을 거부한다", async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    const renderer = new PdfDocumentRenderer(createUnusedFontProvider());

    try {
      await expect(renderer.render(createPayslipTemplate(), {}, "preview"))
        .rejects.toThrow("PDF 미리보기 렌더도 서버에서 실행해야 한다");
    } finally {
      restoreWindow(originalWindow);
    }
  });

  it("고정 이미지 ID를 공급자에서 읽어 실제 PDF 이미지로 임베딩한다", async () => {
    const load = vi.fn(async () => ({
      bytes: createOnePixelPng(),
      mediaType: "image/png" as const,
    }));
    const imageProvider: ImageProvider = { load };
    const template = createPayslipTemplate()
      .createNextVersion()
      .addElement(new ImageElement(
        "logo", new Frame(10, 7, 12, 8), 10, false, { assetId: "company-logo" },
      ))
      .publish();
    const renderer = new PdfDocumentRenderer(createFileFontProvider(), imageProvider);

    const bytes = await renderer.render(template, {}, "authoritative");

    expect(load).toHaveBeenCalledExactlyOnceWith("company-logo");
    expect(bytes.length).toBeGreaterThan(10_000);
  });

  it("데이터에 바인딩된 이미지도 별도 공급자 없이 PDF에 임베딩한다", async () => {
    const image = {
      bytes: createOnePixelPng(),
      mediaType: "image/png" as const,
    };
    const template = createPayslipTemplate()
      .createNextVersion()
      .addElement(new ImageElement(
        "photo",
        new Frame(10, 7, 12, 8),
        10,
        false,
        { binding: new Binding("employee.photo"), fit: "contain" },
      ))
      .publish();
    const renderer = new PdfDocumentRenderer(createFileFontProvider());

    const bytes = await renderer.render(
      template,
      { employee: { photo: image } },
      "authoritative",
    );

    expect(bytes.length).toBeGreaterThan(10_000);
  });

  it("서버 preview에는 발행본에 없는 워터마크 내용을 추가한다", async () => {
    const renderer = new PdfDocumentRenderer(createFileFontProvider());
    const template = createPayslipTemplate();

    const authoritative = await renderer.render(template, {}, "authoritative");
    const preview = await renderer.render(template, {}, "preview");

    expect(preview.length).toBeGreaterThan(authoritative.length);
  });

  it("ImageProvider가 없으면 고정 이미지 렌더링 중 명시적 예외를 던진다", async () => {
    const template = createPayslipTemplate()
      .createNextVersion()
      .addElement(new ImageElement(
        "logo", new Frame(10, 7, 12, 8), 10, false, { assetId: "company-logo" },
      ))
      .publish();

    const renderer = new PdfDocumentRenderer(createFileFontProvider());
    await expect(renderer.render(template, {}, "authoritative"))
      .rejects.toThrow("고정 이미지 company-logo를 불러올 ImageProvider가 없다");
  });
});

/** 브라우저 차단이 폰트 접근보다 먼저 일어나는지 확인할 공급자를 만든다. */
function createUnusedFontProvider(): FontProvider {
  return {
    load: async () => {
      throw new Error("폰트를 요청하면 안 된다");
    },
  };
}

/** 실제 이미지 임베딩 테스트가 사용할 검증된 Pretendard TTF를 공급한다. */
function createFileFontProvider(): FontProvider {
  return {
    load: async (_family, weight) => new Uint8Array(readFileSync(
      `node_modules/pretendard/dist/public/static/alternative/Pretendard-${weight >= 700 ? "Bold" : "Regular"}.ttf`,
    )),
  };
}

/** 테스트 이미지가 Node의 Buffer 타입에 의존하지 않도록 PNG 바이트를 만든다. */
function createOnePixelPng(): Uint8Array {
  const encoded = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** 테스트가 실행 전의 전역 window 상태를 훼손하지 않도록 되돌린다. */
function restoreWindow(originalWindow: PropertyDescriptor | undefined): void {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
    return;
  }
  Object.defineProperty(globalThis, "window", originalWindow);
}
