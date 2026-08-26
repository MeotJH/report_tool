import fontkit from "@pdf-lib/fontkit";
import {
  BindingResolver,
  DocumentLayout,
  type DocumentRenderer,
  type FontProvider,
  type ImageAsset,
  ImageElement,
  type ImageProvider,
  type PageLayout,
  type RenderMode,
  TableCellText,
  type TableLayoutResult,
  TableRowHeights,
  Template,
  TextLayout,
} from "@report-tool/core";
import {
  degrees,
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
} from "pdf-lib";
import { FontSubsetter } from "../font/FontSubsetter.js";
import { UsedCharCollector } from "../font/UsedCharCollector.js";
import { PdfElementVisitor } from "./PdfElementVisitor.js";
import { PdfFontBook } from "./PdfFontBook.js";

/** 도메인 템플릿을 한글 폰트가 포함된 미리보기 또는 권위 PDF로 변환한다. */
export class PdfDocumentRenderer implements DocumentRenderer {
  private static readonly POINTS_PER_MM = 72 / 25.4;
  private static readonly FONT_WEIGHTS = [400, 700] as const;
  private static readonly PREVIEW_TEXT = "PREVIEW";

  /** 호스트가 승인한 TTF만 공급하도록 폰트 파일 접근을 포트 뒤에 둔다. */
  constructor(
    private readonly fontProvider: FontProvider,
    private readonly imageProvider?: ImageProvider,
  ) {}

  /** 문자 수집부터 폰트 임베딩과 요소 그리기까지 동일한 PDF 파이프라인으로 처리한다. */
  async render(
    template: Template,
    data: unknown,
    mode: RenderMode,
  ): Promise<Uint8Array> {
    this.assertAllowedEnvironment(mode);
    const bindingResolver = new BindingResolver();
    const usedChars = this.collectUsedCharacters(template, data, mode, bindingResolver);
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fonts = new PdfFontBook(await this.embedFonts(pdf, template.fonts, usedChars));
    const images = await this.embedImages(pdf, template, data);
    for (const layout of this.layoutPages(template, data, fonts)) {
      const page = this.addPage(pdf, template);
      this.drawPage(page, layout, template, data, fonts, images, bindingResolver);
      if (mode === "preview") this.drawPreviewWatermark(page, fonts);
    }
    return pdf.save();
  }

  /** 브라우저 코드가 실수로 법적 발행본을 생성하지 못하도록 즉시 차단한다. */
  private assertAllowedEnvironment(mode: RenderMode): void {
    if (typeof window === "undefined") return;
    if (mode === "authoritative") throw new Error("발행본 렌더는 서버에서만 허용된다");
    throw new Error("PDF 미리보기 렌더도 서버에서 실행해야 한다");
  }

  /** 워터마크까지 포함해 폰트 서브셋에서 빠질 수 있는 문자를 모두 모은다. */
  private collectUsedCharacters(
    template: Template,
    data: unknown,
    mode: RenderMode,
    bindingResolver: BindingResolver,
  ): string {
    const collected = new UsedCharCollector(data, bindingResolver).collect(template);
    const withWatermark = mode === "preview"
      ? collected + PdfDocumentRenderer.PREVIEW_TEXT
      : collected;
    return [...new Set(withWatermark)].join("");
  }

  /** 모든 승인 폰트의 Regular와 Bold를 미리 서브셋한 뒤 subset false로 임베딩한다. */
  private async embedFonts(
    pdf: PDFDocument,
    families: readonly string[],
    usedChars: string,
  ): Promise<Map<string, PDFFont>> {
    if (families.length === 0) {
      throw new Error("템플릿에 사용할 폰트가 없다");
    }
    const fonts = new Map<string, PDFFont>();
    for (const family of new Set(families)) {
      for (const weight of PdfDocumentRenderer.FONT_WEIGHTS) {
        const rawBytes = await this.fontProvider.load(family, weight);
        const subsetBytes = await new FontSubsetter().subset(rawBytes, usedChars);
        const font = await pdf.embedFont(subsetBytes, { subset: false });
        fonts.set(PdfFontBook.key(family, weight), font);
      }
    }
    return fonts;
  }

  /** 템플릿의 mm 페이지 크기를 동일한 물리 크기의 PDF pt 페이지로 만든다. */
  private addPage(pdf: PDFDocument, template: Template): PDFPage {
    return pdf.addPage([
      this.toPoints(template.page.widthMm()),
      this.toPoints(template.page.heightMm()),
    ]);
  }

  /** 고정 자산과 데이터 바인딩 이미지를 PDF 객체로 한 번만 임베딩한다. */
  private async embedImages(
    pdf: PDFDocument,
    template: Template,
    data: unknown,
  ): Promise<Map<string, PDFImage>> {
    const images = new Map<string, PDFImage>();
    for (const element of template.getElements()) {
      if (!(element instanceof ImageElement)) continue;
      const asset = await this.resolveImageAsset(element, data);
      const image = asset.mediaType === "image/png"
        ? await pdf.embedPng(asset.bytes)
        : await pdf.embedJpg(asset.bytes);
      images.set(element.id, image);
    }
    return images;
  }

  /** 이미지 출처 종류에 따라 호스트 자산 또는 데이터 스냅샷에서 바이트를 가져온다. */
  private async resolveImageAsset(
    element: ImageElement,
    data: unknown,
  ): Promise<ImageAsset> {
    if (element.assetId !== undefined) {
      if (this.imageProvider === undefined) {
        throw new Error(`고정 이미지 ${element.assetId}를 불러올 ImageProvider가 없다`);
      }
      return this.imageProvider.load(element.assetId);
    }
    const value = element.binding?.path.resolve(data);
    if (!this.isImageAsset(value)) {
      throw new Error(`이미지 요소 ${element.id}의 바인딩 값이 올바른 이미지가 아니다`);
    }
    return value;
  }

  /** 알 수 없는 데이터가 지원하는 이미지 바이트와 미디어 타입을 모두 갖췄는지 검사한다. */
  private isImageAsset(value: unknown): value is ImageAsset {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as { bytes?: unknown; mediaType?: unknown };
    const supportedType = candidate.mediaType === "image/png"
      || candidate.mediaType === "image/jpeg";
    return candidate.bytes instanceof Uint8Array && supportedType;
  }

  /**
   * 문서가 몇 쪽이 되고 각 쪽에 무엇이 놓이는지를 도메인에 묻는다.
   *
   * 쪽 수는 저장된 값이 아니라 데이터가 정한다. 이 계산을 렌더러가 따로 하면
   * 편집기가 본 쪽 수와 발행본의 쪽 수가 갈린다.
   */
  private layoutPages(
    template: Template,
    data: unknown,
    fonts: PdfFontBook,
  ): readonly PageLayout[] {
    return new DocumentLayout(
      TableCellText.resolved(),
      TableRowHeights.content((style) => fonts.measurerFor(style)),
    ).compute(template, data);
  }

  /** 한 쪽에 놓인 것들을 배치가 정한 순서 그대로 그린다. */
  private drawPage(
    page: PDFPage,
    layout: PageLayout,
    template: Template,
    data: unknown,
    fonts: PdfFontBook,
    images: ReadonlyMap<string, PDFImage>,
    bindingResolver: BindingResolver,
  ): void {
    const tables = new Map<string, TableLayoutResult>();
    for (const placement of layout.placements) {
      if (placement.table !== null) tables.set(placement.element.id, placement.table);
    }
    const visitor = new PdfElementVisitor(
      page,
      template.page.heightMm(),
      fonts,
      data,
      bindingResolver,
      new TextLayout(),
      images,
      tables,
    );
    layout.placements.forEach((placement) => placement.element.accept(visitor));
  }

  /** 미리보기와 발행본을 혼동하지 않도록 페이지 중앙에 반투명 표식을 남긴다. */
  private drawPreviewWatermark(page: PDFPage, fonts: PdfFontBook): void {
    const font = fonts.any();
    const { width, height } = page.getSize();
    page.drawText(PdfDocumentRenderer.PREVIEW_TEXT, {
      x: width * 0.2,
      y: height * 0.45,
      size: 52,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.18,
      rotate: degrees(-35),
    });
  }

  /** 문서의 mm 물리 단위를 PDF의 pt 물리 단위로 변환한다. */
  private toPoints(millimeters: number): number {
    return millimeters * PdfDocumentRenderer.POINTS_PER_MM;
  }
}
