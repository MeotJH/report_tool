import {
  BindingResolver,
  type BoxElement,
  ContentResolver,
  type ElementVisitor,
  type FieldElement,
  Frame,
  type ImageElement,
  type LineElement,
  type SignatureElement,
  TableCellRole,
  type TableColumn,
  type TableElement,
  TableCellText,
  TableLayout,
  type TableLayoutRow,
  TableRowHeights,
  type TextAlign,
  TextLayout,
  TextStyle,
  type TextElement,
} from "@report-tool/core";
import {
  type PDFImage,
  type PDFPage,
  type PDFFont,
  rgb,
  type RGB,
} from "pdf-lib";

/** 도메인 요소를 좌표와 스타일 규칙에 맞춰 실제 PDF 페이지 명령으로 변환한다. */
export class PdfElementVisitor implements ElementVisitor<void> {
  private static readonly POINTS_PER_MM = 72 / 25.4;
  private static readonly DEFAULT_BORDER_MM = 0.2;

  private readonly tableLayout = new TableLayout(
    TableCellText.resolved(),
    TableRowHeights.content((style) => this.measurerFor(style)),
  );

  /** 요소 해석에 필요한 데이터와 PDF 자원을 한 렌더링 세션 동안 공유한다. */
  constructor(
    private readonly page: PDFPage,
    private readonly pageHeightMm: number,
    private readonly fonts: ReadonlyMap<string, PDFFont>,
    private readonly data: unknown,
    private readonly bindingResolver: BindingResolver,
    private readonly textLayout: TextLayout,
    private readonly images: ReadonlyMap<string, PDFImage>,
  ) {}

  /** 저장된 문구를 실제 데이터로 해석한 뒤 공통 텍스트 배치 규칙으로 그린다. */
  visitText(element: TextElement): void {
    const text = ContentResolver.resolve(element.content, this.data);
    this.drawTextBox(text, element.frame, element.style);
  }

  /** 데이터 바인딩과 포맷이 적용된 최종 문자열을 공통 텍스트 규칙으로 그린다. */
  visitField(element: FieldElement): void {
    const text = this.bindingResolver.resolve(element.binding, this.data);
    this.drawTextBox(text, element.frame, element.style);
  }

  /**
   * 도메인이 정한 줄 목록을 그대로 그린다.
   *
   * 몇 줄이 나올지, 어느 줄이 영역을 넘어 빠지는지는 `TableLayout`이 정한다.
   * 여기서 다시 판단하면 편집기와 발행본이 다시 갈라진다.
   */
  visitTable(element: TableElement): void {
    for (const row of this.tableLayout.compute(element, this.data).rows) {
      this.drawTableRow(element, row);
    }
  }

  /** 미리 임베딩된 이미지를 요소의 contain·cover·stretch 정책에 맞춰 배치한다. */
  visitImage(element: ImageElement): void {
    const rectangle = element.frame.toPdfRect(this.pageHeightMm);
    const image = this.images.get(element.id);
    if (image === undefined) {
      throw new Error(`이미지 요소 ${element.id}의 자산을 찾을 수 없다`);
    }
    const size = this.fitImage(image, rectangle.width, rectangle.height, element.fit);
    this.page.drawImage(image, {
      x: rectangle.x + (rectangle.width - size.width) / 2,
      y: rectangle.y + (rectangle.height - size.height) / 2,
      width: size.width,
      height: size.height,
    });
  }

  /** 배경과 테두리 설정을 PDF 사각형 명령으로 변환한다. */
  visitBox(element: BoxElement): void {
    const rectangle = element.frame.toPdfRect(this.pageHeightMm);
    this.page.drawRectangle({
      ...rectangle,
      color: element.fill === undefined ? undefined : this.toColor(element.fill),
      borderColor: element.stroke === undefined ? undefined : this.toColor(element.stroke),
      borderWidth: this.toPoints(element.strokeWidth ?? 0),
    });
  }

  /** 좌상단 문서 좌표의 선분을 PDF 좌하단 좌표의 선분으로 변환한다. */
  visitLine(element: LineElement): void {
    const rectangle = element.frame.toPdfRect(this.pageHeightMm);
    this.page.drawLine({
      start: { x: rectangle.x, y: rectangle.y + rectangle.height },
      end: { x: rectangle.x + rectangle.width, y: rectangle.y },
      color: this.toColor(element.stroke),
      thickness: this.toPoints(element.strokeWidth),
      dashArray: element.dash === undefined
        ? undefined
        : element.dash.map((dash) => this.toPoints(dash)),
    });
  }

  /** 발행 전 비어 있어야 하는 서명 영역을 점선과 안내 문구로 표시한다. */
  visitSignature(element: SignatureElement): void {
    const rectangle = element.frame.toPdfRect(this.pageHeightMm);
    this.page.drawRectangle({
      ...rectangle,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: this.toPoints(PdfElementVisitor.DEFAULT_BORDER_MM),
      borderDashArray: [3, 3],
    });
    if (element.label !== undefined) {
      const style = new TextStyle(this.firstFontFamily(), 8, { align: "center", color: "#777777" });
      this.drawTextBox(element.label, element.frame, style);
    }
  }

  /** 표 데이터가 배열이 아닐 때 빈 표로 처리해 렌더링 전체가 깨지지 않게 한다. */
  private resolveRows(element: TableElement): readonly unknown[] {
    return element.source.resolveRows(this.data);
  }

  /** 한 표 행의 열 너비와 정렬을 유지하며 셀 배경·테두리·문구를 함께 그린다. */
  private drawTableRow(
    element: TableElement,
    row: TableLayoutRow,
  ): void {
    const cells = row.cells;
    const rowIndex = row.offset;
    let x = element.frame.x;
    element.columns.forEach((column, columnIndex) => {
      const frame = this.createCellFrame(element, column, x, row);
      const header = TableCellRole.at(element, rowIndex, columnIndex) === "header";
      this.drawCell(frame, header ? element.headerFill : null);
      const baseStyle = header ? element.headerStyle : element.cellStyle;
      this.drawTextBox(cells[columnIndex] ?? "", frame, this.withAlign(baseStyle, column.align));
      x += column.width;
    });
  }

  /** 표의 행·열 좌표를 문서의 절대 mm 영역으로 변환한다. */
  private createCellFrame(
    element: TableElement,
    column: TableColumn,
    x: number,
    row: TableLayoutRow,
  ): Frame {
    return new Frame(x, element.frame.y + row.topMm, column.width, row.heightMm);
  }

  /**
   * 표 셀의 배경과 경계를 한 번에 그린다.
   *
   * 배경은 글자보다 먼저 깔려야 한다. 셀 단위로 그리므로 머리글로 지정된 열이
   * 세로로 이어진 띠처럼 보이고, 그것이 화면에서 본 모습과 같다.
   */
  private drawCell(frame: Frame, fill: string | null): void {
    this.page.drawRectangle({
      ...frame.toPdfRect(this.pageHeightMm),
      color: fill === null ? undefined : this.toColor(fill),
      borderColor: rgb(0.45, 0.45, 0.45),
      borderWidth: this.toPoints(PdfElementVisitor.DEFAULT_BORDER_MM),
    });
  }

  /** 이미지 비율 정책을 실제 PDF 영역 안에서 사용할 pt 크기로 계산한다. */
  private fitImage(
    image: PDFImage,
    availableWidth: number,
    availableHeight: number,
    fit: "contain" | "cover" | "stretch",
  ): { width: number; height: number } {
    if (fit === "stretch") {
      return { width: availableWidth, height: availableHeight };
    }
    const scaleX = availableWidth / image.width;
    const scaleY = availableHeight / image.height;
    const scale = fit === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    return { width: image.width * scale, height: image.height * scale };
  }

  /** 텍스트 레이아웃 결과의 각 줄을 정렬과 세로 위치에 맞춰 그린다. */
  private drawTextBox(text: string, frame: Frame, style: TextStyle): void {
    const font = this.findFont(style);
    const measure = (line: string, size: number): number => font.widthOfTextAtSize(line, size);
    const layout = this.textLayout.layout(text, style, frame.width, measure);
    const rectangle = frame.toPdfRect(this.pageHeightMm);
    const firstBaseline = this.resolveFirstBaseline(rectangle, layout.lines.length, layout.fontSize, style);
    layout.lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: this.resolveTextX(rectangle, line, layout.fontSize, style.align, font),
        y: firstBaseline - index * layout.fontSize * style.lineHeight,
        size: layout.fontSize,
        font,
        color: this.toColor(style.color),
      });
    });
  }

  /** 임베딩한 폰트가 아는 실제 글자 폭을 도메인 줄 계산에 넘긴다. */
  private measurerFor(style: TextStyle): (text: string, sizePt: number) => number {
    const font = this.findFont(style);
    return (text: string, sizePt: number): number => font.widthOfTextAtSize(text, sizePt);
  }

  /** 텍스트 굵기에 정확히 맞는 폰트를 찾고 500은 Regular로 안전하게 대체한다. */
  private findFont(style: TextStyle): PDFFont {
    const exact = this.fonts.get(this.fontKey(style.font, style.weight));
    const fallback = this.fonts.get(this.fontKey(style.font, 400));
    const font = exact ?? fallback ?? this.fonts.values().next().value;
    if (font === undefined) {
      throw new Error(`PDF 폰트 ${style.font}을 찾을 수 없다`);
    }
    return font;
  }

  /** 같은 셀 스타일을 보존하면서 열마다 지정된 가로 정렬만 적용한다. */
  private withAlign(style: TextStyle, align: TextAlign): TextStyle {
    return new TextStyle(style.font, style.size, {
      weight: style.weight,
      italic: style.italic,
      color: style.color,
      align,
      valign: style.valign,
      lineHeight: style.lineHeight,
      overflow: style.overflow,
    });
  }

  /** 가로 정렬에 따라 셀 안에서 실제 텍스트 시작점을 계산한다. */
  private resolveTextX(
    rectangle: { x: number; width: number },
    text: string,
    size: number,
    align: TextAlign,
    font: PDFFont,
  ): number {
    const width = font.widthOfTextAtSize(text, size);
    if (align === "right") return rectangle.x + rectangle.width - width;
    if (align === "center") return rectangle.x + (rectangle.width - width) / 2;
    return rectangle.x;
  }

  /** 세로 정렬과 줄 높이를 반영해 첫 줄의 기준선을 계산한다. */
  private resolveFirstBaseline(
    rectangle: { y: number; height: number },
    lineCount: number,
    fontSize: number,
    style: TextStyle,
  ): number {
    const totalHeight = fontSize + (lineCount - 1) * fontSize * style.lineHeight;
    if (style.valign === "bottom") return rectangle.y + totalHeight - fontSize;
    if (style.valign === "middle") return rectangle.y + (rectangle.height + totalHeight) / 2 - fontSize;
    return rectangle.y + rectangle.height - fontSize;
  }

  /** CSS hex 색상을 pdf-lib가 요구하는 0~1 RGB 값으로 변환한다. */
  private toColor(hex: string): RGB {
    const normalized = hex.replace("#", "");
    const expanded = normalized.length === 3
      ? [...normalized].map((character) => character.repeat(2)).join("")
      : normalized;
    const value = Number.parseInt(expanded, 16);
    return rgb((value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255);
  }

  /** 문서의 mm 표현값을 PDF 라이브러리의 pt 단위로 바꾼다. */
  private toPoints(millimeters: number): number {
    return millimeters * PdfElementVisitor.POINTS_PER_MM;
  }

  /** 폰트 Map의 가족명과 굵기를 충돌 없는 동일한 키로 결합한다. */
  private fontKey(family: string, weight: number): string {
    return `${family}:${weight}`;
  }

  /** 서명 안내 문구가 사용할 기본 폰트 가족을 등록된 키에서 복원한다. */
  private firstFontFamily(): string {
    const firstKey = this.fonts.keys().next().value;
    if (firstKey === undefined) {
      throw new Error("PDF에 등록된 폰트가 없다");
    }
    return firstKey.split(":")[0] ?? firstKey;
  }
}
