import { describe, expect, it } from "vitest";
import { Binding } from "../value/Binding";
import { Frame } from "../value/Frame";
import { TextStyle } from "../value/TextStyle";
import { BoxElement } from "./BoxElement";
import type { Content } from "./Content";
import type { Element } from "./Element";
import type { ElementVisitor } from "./ElementVisitor";
import { FieldElement } from "./FieldElement";
import { ImageElement } from "./ImageElement";
import { LineElement } from "./LineElement";
import { SignatureElement } from "./SignatureElement";
import { TableColumn } from "./TableColumn";
import { TableElement } from "./TableElement";
import { TextElement } from "./TextElement";

const frame = new Frame(10, 20, 30, 40);
const style = new TextStyle("Pretendard", 10);
const binding = new Binding("employee.name");
const content: Content = { kind: "literal", value: "임금명세서" };

const visitor: ElementVisitor<string> = {
  visitText: () => "text",
  visitField: () => "field",
  visitTable: () => "table",
  visitImage: () => "image",
  visitBox: () => "box",
  visitLine: () => "line",
  visitSignature: () => "signature",
};

const areaVisitor: ElementVisitor<number> = {
  visitText: (element) => element.frame.width * element.frame.height,
  visitField: (element) => element.frame.width * element.frame.height,
  visitTable: (element) => element.frame.width * element.frame.height,
  visitImage: (element) => element.frame.width * element.frame.height,
  visitBox: (element) => element.frame.width * element.frame.height,
  visitLine: (element) => element.frame.width * element.frame.height,
  visitSignature: (element) => element.frame.width * element.frame.height,
};

describe("Element Visitor", () => {
  const elements: ReadonlyArray<readonly [Element, string]> = [
    [new TextElement("text", frame, 0, false, content, style), "text"],
    [new FieldElement("field", frame, 1, false, binding, style), "field"],
    [
      new TableElement(
        "table",
        frame,
        2,
        false,
        new Binding("items"),
        [new TableColumn("name", "항목", "{{row.name}}", 30, "left", null)],
        8,
        style,
        style,
        true,
        "clip",
      ),
      "table",
    ],
    [
      new ImageElement("image", frame, 3, false, {
        assetId: "company-logo",
        fit: "contain",
      }),
      "image",
    ],
    [new BoxElement("box", frame, 4, false, { stroke: "#000000" }), "box"],
    [new LineElement("line", frame, 5, false, "#000000", 0.5), "line"],
    [
      new SignatureElement("signature", frame, 6, false, "employee"),
      "signature",
    ],
  ];

  it.each(elements)("각 요소를 해당 Visitor 메서드에 연결한다", (element, expected) => {
    expect(element.accept(visitor)).toBe(expected);
  });

  it("frame만 변경한 같은 종류의 새 요소를 반환한다", () => {
    const original = new TextElement("text", frame, 0, false, content, style);
    const nextFrame = new Frame(50, 60, 70, 80);

    const moved = original.withFrame(nextFrame);

    expect(moved).toBeInstanceOf(TextElement);
    expect(moved.frame.equals(nextFrame)).toBe(true);
    expect(original.frame.equals(frame)).toBe(true);
  });
});

describe("TableColumn", () => {
  it("반복 행을 표시하는 열 설정을 보관한다", () => {
    const column = new TableColumn(
      "amount",
      "금액",
      "{{row.amount}}",
      40,
      "right",
      { kind: "currency", currency: "KRW" },
    );

    expect(column.key).toBe("amount");
    expect(column.header).toBe("금액");
    expect(column.cellTemplate).toBe("{{row.amount}}");
    expect(column.width).toBe(40);
    expect(column.align).toBe("right");
    expect(column.formatSpec).toEqual({ kind: "currency", currency: "KRW" });
  });
});

describe("ImageElement", () => {
  it("고정 이미지와 데이터 바인딩을 동시에 허용하지 않는다", () => {
    expect(
      () => new ImageElement("image", frame, 0, false, {
        assetId: "logo",
        binding,
      }),
    ).toThrow("이미지는 assetId 또는 binding 중 하나만 가져야 한다");
  });

  it("이미지 출처가 없는 요소를 허용하지 않는다", () => {
    expect(
      () => new ImageElement("image", frame, 0, false, {}),
    ).toThrow("이미지는 assetId 또는 binding 중 하나만 가져야 한다");
  });

  it("하나의 이미지 출처만 있으면 생성한다", () => {
    const element = new ImageElement("image", frame, 0, false, {
      binding,
      fit: "cover",
    });

    expect(element.binding).toBe(binding);
    expect(element.assetId).toBeUndefined();
    expect(element.fit).toBe("cover");
  });
});

describe("Area Visitor", () => {
  it("TextElement의 면적을 계산한다", () => {
    const textElement = new TextElement(
      "text-area",
      new Frame(0, 0, 40, 30),
      0,
      false,
      content,
      style,
    );

    const area = textElement.accept(areaVisitor);

    expect(area).toBe(1200);
  });

  it("BoxElement의 면적을 계산한다", () => {
    const boxElement = new BoxElement(
      "box-area",
      new Frame(0, 0, 20, 10),
      0,
      false,
    );

    const area = boxElement.accept(areaVisitor);

    expect(area).toBe(200);
  });
});
