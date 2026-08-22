import Konva from "konva";
import {
  ContentResolver,
  TemplateExpression,
  type Binding,
  type BindingResolver,
  type BoxElement,
  type Element,
  type ElementVisitor,
  type FieldElement,
  type ImageElement,
  type LineElement,
  type SignatureElement,
  type TableElement,
  type TextElement,
  type TextStyle,
} from "@report-tool/core";
import type { EditorMode } from "../controller/EditorController.js";

/** 화면 안에서 배치되는 사각 영역을 픽셀 단위로 전달한다. */
interface PixelFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * 도메인 요소를 인쇄 근거가 아닌 편집용 Konva 도형으로 변환한다.
 *
 * 설계 모드에서는 어떤 데이터가 연결됐는지를, 미리보기 모드에서는 실제로 무엇이
 * 찍히는지를 보여준다. 두 모드가 같은 요소 정의를 쓰기 때문에 화면이 어긋나지 않는다.
 */
export class KonvaElementVisitor implements ElementVisitor<Konva.Node> {
  private static readonly POINTS_PER_MM = 72 / 25.4;
  private static readonly TOKEN_FILL = "#eef2ff";
  private static readonly TOKEN_STROKE = "#a5b4fc";
  private static readonly TOKEN_TEXT = "#4338ca";
  private static readonly PLACEHOLDER_LINE = "#94a3b8";

  /** 화면 배율·샘플 데이터·표시 모드를 주입해 도메인과 브라우저 표현을 분리한다. */
  constructor(
    private readonly mmToPx: number,
    private readonly data: unknown,
    private readonly bindingResolver: BindingResolver,
    private readonly mode: EditorMode = "design",
  ) {}

  /** 고정·템플릿 문구를 배치 영역과 스타일이 반영된 편집 텍스트로 만든다. */
  visitText(element: TextElement): Konva.Node {
    const text = ContentResolver.resolve(element.content, this.data);
    return this.mark(this.createTextNode(text, element.style, this.pixelFrame(element)), element);
  }

  /** 설계 모드에서는 연결된 데이터를 Token으로, 미리보기에서는 실제 값을 보여준다. */
  visitField(element: FieldElement): Konva.Node {
    const group = this.createFrameGroup(element);
    const frame = this.localFrame(element);
    if (this.mode === "preview") {
      group.add(this.createTextNode(
        this.bindingResolver.resolve(element.binding, this.data), element.style, frame,
      ));
      return this.mark(group, element);
    }
    group.add(this.createTokenBackground(frame));
    group.add(this.createTokenText(this.tokenLabel(element.binding), element.style, frame));
    return this.mark(group, element);
  }

  /** 헤더와 본문을 같은 배치 규칙으로 그리고 모드에 따라 본문 내용만 바꾼다. */
  visitTable(element: TableElement): Konva.Node {
    const group = this.createFrameGroup(element);
    let rowIndex = 0;
    if (element.showHeader) {
      this.addTableRow(group, element, element.columns.map((column) => column.header), rowIndex, false);
      rowIndex += 1;
    }
    for (const values of this.bodyRows(element)) {
      this.addTableRow(group, element, values, rowIndex, true);
      rowIndex += 1;
    }
    return this.mark(group, element);
  }

  /** 실제 자산 로딩 전에도 이미지 자리와 출처 상태를 알아볼 수 있게 한다. */
  visitImage(element: ImageElement): Konva.Node {
    const group = this.createFrameGroup(element);
    const frame = this.localFrame(element);
    group.add(new Konva.Rect({
      ...frame,
      fill: "#f1f5f9",
      stroke: KonvaElementVisitor.PLACEHOLDER_LINE,
      strokeWidth: 1,
    }));
    group.add(new Konva.Line({
      points: [0, 0, frame.width, frame.height],
      stroke: KonvaElementVisitor.PLACEHOLDER_LINE,
      strokeWidth: 0.7,
    }));
    group.add(new Konva.Line({
      points: [frame.width, 0, 0, frame.height],
      stroke: KonvaElementVisitor.PLACEHOLDER_LINE,
      strokeWidth: 0.7,
    }));
    group.add(this.createLabel(this.imageLabel(element), frame));
    return this.mark(group, element);
  }

  /** 문서 장식 상자를 mm 배치와 표현 속성이 반영된 사각형으로 만든다. */
  visitBox(element: BoxElement): Konva.Node {
    return this.mark(new Konva.Rect({
      ...this.pixelFrame(element),
      fill: element.fill,
      stroke: element.stroke,
      strokeWidth: this.toPx(element.strokeWidth ?? 0),
      cornerRadius: this.toPx(element.radius ?? 0),
    }), element);
  }

  /** Frame의 두 끝점을 화면 좌표로 바꿔 선 요소를 만든다. */
  visitLine(element: LineElement): Konva.Node {
    const frame = element.frame;
    return this.mark(new Konva.Line({
      x: this.toPx(frame.x),
      y: this.toPx(frame.y),
      points: [0, 0, this.toPx(frame.width), this.toPx(frame.height)],
      stroke: element.stroke,
      strokeWidth: Math.max(1, this.toPx(element.strokeWidth)),
      dash: element.dash?.map((value) => this.toPx(value)),
    }), element);
  }

  /** 서명 예정 영역을 점선 테두리와 안내 문구로 구분한다. */
  visitSignature(element: SignatureElement): Konva.Node {
    const group = this.createFrameGroup(element);
    const frame = this.localFrame(element);
    group.add(new Konva.Rect({
      ...frame,
      stroke: "#64748b",
      strokeWidth: 1,
      dash: [6, 4],
    }));
    group.add(this.createLabel(element.label ?? `서명 (${element.signer})`, frame));
    return this.mark(group, element);
  }

  /** 설계 모드는 열 Token을, 미리보기 모드는 실제 샘플 행을 본문으로 만든다. */
  private bodyRows(element: TableElement): readonly (readonly string[])[] {
    if (this.mode === "design") {
      return [element.columns.map((column) => `⟨${column.key}⟩`)];
    }
    return this.sampleRows(element).map((row) => element.columns.map((column) => (
      TemplateExpression.render(column.cellTemplate, { row })
    )));
  }

  /** 실제 행 수 대신 편집 화면에 필요한 최대 세 행의 안전한 샘플을 제공한다. */
  private sampleRows(element: TableElement): readonly unknown[] {
    const rows = element.source.resolveRows(this.data);
    return rows.length === 0 ? [{}] : rows.slice(0, 3);
  }

  /** 표 한 행의 각 셀에 배경 경계와 내용을 추가한다. */
  private addTableRow(
    group: Konva.Group,
    element: TableElement,
    values: readonly string[],
    rowIndex: number,
    body: boolean,
  ): void {
    let x = 0;
    element.columns.forEach((column, columnIndex) => {
      const width = this.toPx(column.width);
      const y = this.toPx(element.rowHeight * rowIndex);
      const height = this.toPx(element.rowHeight);
      group.add(new Konva.Rect({
        x, y, width, height,
        fill: body ? undefined : "#f8fafc",
        stroke: "#94a3b8",
        strokeWidth: 0.7,
      }));
      group.add(this.createTableText(
        values[columnIndex] ?? "", element, { x, y, width, height }, body,
      ));
      x += width;
    });
  }

  /** 헤더와 본문이 각자 지정된 스타일과 모드별 표현을 사용하게 한다. */
  private createTableText(
    value: string,
    element: TableElement,
    frame: PixelFrame,
    body: boolean,
  ): Konva.Text {
    const style = body ? element.cellStyle : element.headerStyle;
    const text = this.createTextNode(value, style, frame);
    if (body && this.mode === "design") text.fill(KonvaElementVisitor.TOKEN_TEXT);
    else if (body) text.opacity(0.72);
    return text;
  }

  /** 어떤 데이터가 연결됐는지 경로와 포맷을 함께 읽히게 한다. */
  private tokenLabel(binding: Binding): string {
    const path = binding.path.toString();
    if (binding.formatSpec === null) return path;
    return `${path} · ${binding.formatSpec.kind}`;
  }

  /** 이미지 출처 상태를 화면에서 바로 구분할 수 있게 한다. */
  private imageLabel(element: ImageElement): string {
    if (element.assetId !== undefined && element.assetId.length > 0) return element.assetId;
    if (element.binding !== undefined) return element.binding.path.toString();
    return "이미지 출처 없음";
  }

  /** 데이터 Token이 일반 문구와 확실히 다르게 보이도록 배경을 그린다. */
  private createTokenBackground(frame: PixelFrame): Konva.Rect {
    return new Konva.Rect({
      ...frame,
      fill: KonvaElementVisitor.TOKEN_FILL,
      stroke: KonvaElementVisitor.TOKEN_STROKE,
      strokeWidth: 1,
      cornerRadius: 3,
    });
  }

  /** Token 문구가 요소 스타일의 크기·정렬을 따르면서 색만 구분되게 한다. */
  private createTokenText(value: string, style: TextStyle, frame: PixelFrame): Konva.Text {
    const text = this.createTextNode(value, style, frame);
    text.fill(KonvaElementVisitor.TOKEN_TEXT);
    return text;
  }

  /** 자리표시 요소가 같은 안내 문구 표현을 공유하게 한다. */
  private createLabel(value: string, frame: PixelFrame): Konva.Text {
    return new Konva.Text({
      ...frame,
      text: value,
      fontSize: 11,
      fill: "#64748b",
      align: "center",
      verticalAlign: "middle",
      listening: false,
    });
  }

  /** 모든 복합 요소가 같은 좌상단 좌표계를 쓰는 빈 그룹에서 시작하게 한다. */
  private createFrameGroup(element: Element): Konva.Group {
    return new Konva.Group({
      x: this.toPx(element.frame.x),
      y: this.toPx(element.frame.y),
    });
  }

  /** 단일 도형 요소가 문서 좌표를 그대로 쓰게 한다. */
  private pixelFrame(element: Element): PixelFrame {
    return {
      x: this.toPx(element.frame.x),
      y: this.toPx(element.frame.y),
      width: this.toPx(element.frame.width),
      height: this.toPx(element.frame.height),
    };
  }

  /** 복합 요소 안의 자식이 그룹 원점을 기준으로 배치되게 한다. */
  private localFrame(element: Element): PixelFrame {
    return {
      x: 0,
      y: 0,
      width: this.toPx(element.frame.width),
      height: this.toPx(element.frame.height),
    };
  }

  /** TextStyle의 단위와 정렬을 Konva 텍스트 설정으로 변환한다. */
  private createTextNode(text: string, style: TextStyle, frame: PixelFrame): Konva.Text {
    return new Konva.Text({
      ...frame,
      text,
      fontFamily: style.font,
      fontSize: style.size * (this.mmToPx / KonvaElementVisitor.POINTS_PER_MM),
      fontStyle: this.fontStyle(style),
      fill: style.color,
      align: style.align,
      verticalAlign: style.valign,
      lineHeight: style.lineHeight,
      wrap: style.overflow === "wrap" ? "word" : "none",
      ellipsis: style.overflow === "truncate",
      padding: 1,
    });
  }

  /** 굵기와 기울임을 Konva가 이해하는 단일 fontStyle 문자열로 결합한다. */
  private fontStyle(style: TextStyle): string {
    const bold = style.weight >= 700 ? "bold" : "normal";
    return style.italic ? `${bold} italic` : bold;
  }

  /** 클릭된 Konva 노드에서 원본 도메인 요소를 찾을 식별자를 보존한다. */
  private mark<TNode extends Konva.Node>(node: TNode, element: Element): TNode {
    node.setAttr("elementId", element.id);
    return node;
  }

  /** 모든 문서 mm 좌표를 현재 화면 배율의 픽셀 좌표로 바꾼다. */
  private toPx(millimeters: number): number {
    return millimeters * this.mmToPx;
  }
}
