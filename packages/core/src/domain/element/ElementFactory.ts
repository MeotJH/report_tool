import type { FormatSpec } from "../format/FormatSpec.js";
import { Binding } from "../value/Binding.js";
import { Frame } from "../value/Frame.js";
import {
  TextStyle,
  type FontWeight,
  type TextAlign,
  type TextOverflow,
  type TextVerticalAlign,
} from "../value/TextStyle.js";
import { BoxElement } from "./BoxElement.js";
import type { Content } from "./Content.js";
import { Element } from "./Element.js";
import { FieldElement } from "./FieldElement.js";
import { ImageElement, type ImageFit } from "./ImageElement.js";
import { LineElement } from "./LineElement.js";
import { SignatureElement } from "./SignatureElement.js";
import { TableColumn, type TableColumnAlign } from "./TableColumn.js";
import { TableElement, type TableOverflow } from "./TableElement.js";
import { TableHeaderCells } from "./TableHeaderCells.js";
import {
  BoundTableSource,
  StaticTableSource,
  type TableCellValue,
  type TableSource,
} from "./TableSource.js";
import { TextElement } from "./TextElement.js";

/** JSON에서 모든 요소가 공통으로 복원해야 하는 값을 한 번에 전달한다. */
interface CommonElementValues {
  readonly id: string;
  readonly frame: Frame;
  readonly z: number;
  readonly locked: boolean;
  readonly hidden: boolean;
}

/**
 * 저장된 요소 타입별 생성 분기를 한곳에 모아 템플릿 복원 경로를 일관되게 유지한다.
 */
export class ElementFactory {
  /** 저장된 타입 태그를 보고 대응하는 요소 클래스 인스턴스를 복원한다. */
  static fromJSON(json: Record<string, unknown>): Element {
    switch (json.type) {
      case "text":
        return ElementFactory.createText(json);
      case "field":
        return ElementFactory.createField(json);
      case "table":
        return ElementFactory.createTable(json);
      case "image":
        return ElementFactory.createImage(json);
      case "box":
        return ElementFactory.createBox(json);
      case "line":
        return ElementFactory.createLine(json);
      case "signature":
        return ElementFactory.createSignature(json);
      default:
        throw new Error("지원하지 않는 요소 타입이다");
    }
  }

  /** 요소의 공통 상태와 종류별 상태를 캔버스 구현이 섞이지 않은 JSON 데이터로 만든다. */
  static toJSON(element: Element): Record<string, unknown> {
    return {
      ...element.toJSON(),
      type: element.type,
      id: element.id,
      frame: {
        x: element.frame.x,
        y: element.frame.y,
        width: element.frame.width,
        height: element.frame.height,
      },
      z: element.z,
      locked: element.locked,
      hidden: element.hidden,
    };
  }

  /** 텍스트 요소의 문구와 스타일을 공통 상태에 결합해 복원한다. */
  private static createText(json: Record<string, unknown>): TextElement {
    const common = ElementFactory.readCommon(json);
    return new TextElement(
      common.id,
      common.frame,
      common.z,
      common.locked,
      json.content as Content,
      ElementFactory.readTextStyle(json.style),
      common.hidden,
    );
  }

  /** 데이터 필드의 바인딩과 스타일을 공통 상태에 결합해 복원한다. */
  private static createField(json: Record<string, unknown>): FieldElement {
    const common = ElementFactory.readCommon(json);
    return new FieldElement(
      common.id,
      common.frame,
      common.z,
      common.locked,
      ElementFactory.readBinding(json.binding),
      ElementFactory.readTextStyle(json.style),
      common.hidden,
    );
  }

  /** 반복 표의 열과 행 표현 설정을 공통 상태에 결합해 복원한다. */
  private static createTable(json: Record<string, unknown>): TableElement {
    const common = ElementFactory.readCommon(json);
    return new TableElement(
      common.id,
      common.frame,
      common.z,
      common.locked,
      ElementFactory.readTableSource(json),
      ElementFactory.readColumns(json.columns),
      json.rowHeight as number,
      ElementFactory.readTextStyle(json.headerStyle),
      ElementFactory.readTextStyle(json.cellStyle),
      json.showHeader as boolean,
      json.overflow as TableOverflow,
      common.hidden,
      TableHeaderCells.fromJSON(json.headerCells),
      ElementFactory.readHeaderFill(json.headerFill),
    );
  }

  /**
   * 머리글 배경을 복원하되 머리글 개념 이전에 저장된 표도 그대로 열리게 한다.
   *
   * 필드가 없던 시절의 표는 화면에서 머리글 행에 옅은 배경이 이미 칠해져 있었다.
   * 그 표를 배경 없음으로 복원하면 저장만 했는데 모양이 바뀐다.
   */
  private static readHeaderFill(value: unknown): string | null {
    if (value === undefined) return TableElement.DEFAULT_HEADER_FILL;
    return typeof value === "string" ? value : null;
  }

  /** 이미지의 단일 출처와 맞춤 정책을 공통 상태에 결합해 복원한다. */
  private static createImage(json: Record<string, unknown>): ImageElement {
    const common = ElementFactory.readCommon(json);
    const binding = json.binding === undefined
      ? undefined
      : ElementFactory.readBinding(json.binding);

    return new ImageElement(common.id, common.frame, common.z, common.locked, {
      assetId: json.assetId as string | undefined,
      binding,
      fit: json.fit as ImageFit,
    }, common.hidden);
  }

  /** 사각 도형의 선택적 표현을 공통 상태에 결합해 복원한다. */
  private static createBox(json: Record<string, unknown>): BoxElement {
    const common = ElementFactory.readCommon(json);
    return new BoxElement(common.id, common.frame, common.z, common.locked, {
      fill: json.fill as string | undefined,
      stroke: json.stroke as string | undefined,
      strokeWidth: json.strokeWidth as number | undefined,
      radius: json.radius as number | undefined,
    }, common.hidden);
  }

  /** 선 도형의 필수 표현과 점선 패턴을 공통 상태에 결합해 복원한다. */
  private static createLine(json: Record<string, unknown>): LineElement {
    const common = ElementFactory.readCommon(json);
    return new LineElement(
      common.id,
      common.frame,
      common.z,
      common.locked,
      json.stroke as string,
      json.strokeWidth as number,
      json.dash as readonly number[] | undefined,
      common.hidden,
    );
  }

  /** 서명자와 필수 여부를 공통 상태에 결합해 서명 영역을 복원한다. */
  private static createSignature(json: Record<string, unknown>): SignatureElement {
    const common = ElementFactory.readCommon(json);
    return new SignatureElement(
      common.id,
      common.frame,
      common.z,
      common.locked,
      json.signer as string,
      json.required as boolean,
      json.label as string | undefined,
      common.hidden,
    );
  }

  /**
   * 요소 종류와 무관한 식별·배치 상태를 저장 데이터에서 복원한다.
   *
   * `hidden`은 나중에 추가된 편집 상태이므로 없으면 false로 본다.
   * 이렇게 하면 필드가 없는 기존 템플릿이 예전과 똑같이 동작하므로
   * schemaVersion을 올리지 않아도 된다.
   */
  private static readCommon(json: Record<string, unknown>): CommonElementValues {
    const frame = json.frame as Record<string, unknown>;
    return {
      id: json.id as string,
      frame: new Frame(
        frame.x as number,
        frame.y as number,
        frame.width as number,
        frame.height as number,
      ),
      z: json.z as number,
      locked: json.locked as boolean,
      hidden: json.hidden === true,
    };
  }

  /** 저장된 바인딩 데이터를 경로 동작을 가진 값 객체로 복원한다. */
  private static readBinding(value: unknown): Binding {
    const json = value as Record<string, unknown>;
    const formatSpec = json.formatSpec === null
      ? undefined
      : json.formatSpec as FormatSpec;
    const fallback = json.fallback === null ? undefined : json.fallback as string;

    return new Binding(json.path as string, {
      formatSpec,
      fallback,
      required: json.required as boolean,
    });
  }

  /** 저장된 텍스트 표현 데이터를 불변 스타일 값 객체로 복원한다. */
  private static readTextStyle(value: unknown): TextStyle {
    const json = value as Record<string, unknown>;
    return new TextStyle(json.font as string, json.size as number, {
      weight: json.weight as FontWeight,
      italic: json.italic as boolean,
      color: json.color as string,
      align: json.align as TextAlign,
      valign: json.valign as TextVerticalAlign,
      lineHeight: json.lineHeight as number,
      overflow: json.overflow as TextOverflow,
    });
  }

  /** 저장된 열 배열을 각 열의 값 객체가 보장되는 목록으로 복원한다. */
  private static readColumns(value: unknown): readonly TableColumn[] {
    const columns = value as readonly Record<string, unknown>[];
    return columns.map((column) => ElementFactory.readColumn(column));
  }

  /** 저장된 열 하나의 반복 문구와 표현 설정을 값 객체로 복원한다. */
  private static readColumn(json: Record<string, unknown>): TableColumn {
    const formatSpec = json.formatSpec === null
      ? null
      : json.formatSpec as FormatSpec;
    return new TableColumn(
      json.key as string,
      json.header as string,
      json.cellTemplate as string,
      json.width as number,
      json.align as TableColumnAlign,
      formatSpec,
    );
  }

  /** 새 source 형식과 기존 binding 형식을 모두 표 데이터 전략으로 복원한다. */
  private static readTableSource(json: Record<string, unknown>): TableSource {
    if (json.source === undefined) {
      return new BoundTableSource(ElementFactory.readBinding(json.binding));
    }
    const source = json.source as Record<string, unknown>;
    if (source.kind === "bound") {
      return new BoundTableSource(ElementFactory.readBinding(source.binding));
    }
    if (source.kind === "static") {
      const rows = source.rows as readonly Record<string, TableCellValue>[];
      return new StaticTableSource(rows);
    }
    throw new Error("지원하지 않는 표 데이터 출처다");
  }
}
