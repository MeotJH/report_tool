import Konva from "konva";
import {
  ContentResolver,
  TableCellText,
  type Binding,
  type CellRole,
  type BindingResolver,
  type BoxElement,
  type Element,
  type ElementVisitor,
  type FieldElement,
  type ImageElement,
  type LineElement,
  type SignatureElement,
  type TableElement,
  TableLayout,
  type TableLayoutRow,
  TableRowHeights,
  TextLayout,
  type TextElement,
  type TextStyle,
} from "@report-tool/core";
import type { EditorMode } from "../controller/EditorController.js";
import { CanvasTextMeasurer } from "./CanvasTextMeasurer.js";

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
  private static readonly TEXT_PADDING_PX = 1;

  private readonly textLayout = new TextLayout();
  private readonly measurer = new CanvasTextMeasurer();

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
    for (const row of this.tableLayout().compute(element, this.data).rows) {
      this.addTableRow(group, element, row);
    }
    return this.mark(group, element);
  }

  /**
   * 설계 중에는 사용자가 셀에 써 넣은 것을, 미리보기에서는 찍힐 값을 보여 준다.
   *
   * 줄 수와 잘리는 규칙은 두 모드가 발행본과 완전히 같다. 다른 것은 셀 문자열을
   * 만드는 방식 하나뿐이어야 "화면에서 본 표가 그대로 발행된다"가 성립한다.
   */
  private tableLayout(): TableLayout {
    return new TableLayout(
      this.mode === "design" ? TableCellText.source() : TableCellText.resolved(),
      TableRowHeights.content((style) => this.measurer.forStyle(style)),
    );
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

  /**
   * 표 한 행의 각 셀에 배경 경계와 내용을 추가한다.
   *
   * 어떤 칸이 머리글인지는 배치가 이미 정해 두었다. 여기서 다시 판단하면 PDF와
   * 갈라져서, 편집기에서 회색이던 칸이 발행본에서는 흰색으로 나온다.
   */
  private addTableRow(
    group: Konva.Group,
    element: TableElement,
    row: TableLayoutRow,
  ): void {
    let x = 0;
    element.columns.forEach((column, columnIndex) => {
      const width = this.toPx(column.width);
      const y = this.toPx(row.topMm);
      const height = this.toPx(row.heightMm);
      const role = row.roles[columnIndex] ?? "body";
      group.add(new Konva.Rect({
        x, y, width, height,
        fill: role === "header" ? element.headerFill ?? undefined : undefined,
        stroke: "#94a3b8",
        strokeWidth: 0.7,
      }));
      group.add(this.createTableText(
        row.cells[columnIndex] ?? "", element, { x, y, width, height }, role,
      ));
      x += width;
    });
  }

  /** 머리글과 본문이 각자 지정된 스타일과 모드별 표현을 사용하게 한다. */
  private createTableText(
    value: string,
    element: TableElement,
    frame: PixelFrame,
    role: CellRole,
  ): Konva.Text {
    const body = role === "body";
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

  /**
   * 줄 나누기를 도메인에 맡기고 Konva에는 확정된 줄만 넘긴다.
   *
   * Konva의 `wrap`을 쓰면 PDF와 다른 규칙으로 줄이 나뉜다. 실제로 어긋났었다 —
   * 캔버스는 `\n`을 지키고 PDF는 무시해서, 편집기에서 본 조문과 발행된 조문의
   * 순서가 달랐다. 같은 계산을 쓰는 것이 이 클래스가 지켜야 할 규칙이다.
   */
  private createTextNode(text: string, style: TextStyle, frame: PixelFrame): Konva.Text {
    const widthMm = frame.width / this.mmToPx;
    const layout = this.textLayout.layout(
      text, style, widthMm, this.measurer.forStyle(style),
    );
    // 안쪽 여백만큼 글자가 쓸 수 있는 높이가 줄어든다. 이것을 빼지 않으면 딱 맞게
    // 계산된 마지막 줄을 Konva가 조용히 지운다 — 도메인이 그리라고 한 줄이 사라진다.
    const usableHeightMm = (frame.height - KonvaElementVisitor.TEXT_PADDING_PX * 2) / this.mmToPx;
    const fits = this.textLayout.heightMm(layout, style) <= usableHeightMm;
    return new Konva.Text({
      ...frame,
      // 넘치는 문구는 높이를 비워 Konva가 조용히 잘라내지 않고 PDF처럼 넘쳐 보이게 한다.
      height: fits ? frame.height : undefined,
      text: layout.lines.join("\n"),
      fontFamily: style.font,
      fontSize: layout.fontSize * (this.mmToPx / KonvaElementVisitor.POINTS_PER_MM),
      fontStyle: this.fontStyle(style),
      fill: style.color,
      align: style.align,
      verticalAlign: fits ? style.valign : "top",
      lineHeight: style.lineHeight,
      wrap: "none",
      padding: KonvaElementVisitor.TEXT_PADDING_PX,
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
