import { describe, expect, it } from "vitest";
import { Binding } from "../value/Binding";
import { Frame } from "../value/Frame";
import { TextStyle } from "../value/TextStyle";
import { BoxElement } from "./BoxElement";
import type { Content } from "./Content";
import type { Element } from "./Element";
import { ElementFactory } from "./ElementFactory";
import { FieldElement } from "./FieldElement";
import { ImageElement } from "./ImageElement";
import { LineElement } from "./LineElement";
import { SignatureElement } from "./SignatureElement";
import { TableColumn } from "./TableColumn";
import { TableElement } from "./TableElement";
import { TextElement } from "./TextElement";

const frame = new Frame(10, 20, 100, 30);
const style = new TextStyle("Pretendard", 11, { align: "center" });
const content: Content = { kind: "template", value: "{{employee.name}} 님" };

const elements: readonly Element[] = [
  new TextElement("text", frame, 0, false, content, style),
  new FieldElement(
    "field",
    frame,
    1,
    true,
    new Binding("pay.net", {
      formatSpec: { kind: "currency", currency: "KRW" },
      fallback: "0원",
      required: true,
    }),
    style,
  ),
  new TableElement(
    "table",
    frame,
    2,
    false,
    new Binding("items"),
    [new TableColumn("amount", "금액", "{{row.amount}}", 40, "right", null)],
    8,
    style,
    new TextStyle("Pretendard", 9),
    true,
    "clip",
  ),
  new ImageElement("image", frame, 3, false, {
    assetId: "company-logo",
    fit: "contain",
  }),
  new BoxElement("box", frame, 4, false, {
    fill: "#FFFFFF",
    stroke: "#000000",
    strokeWidth: 0.5,
    radius: 2,
  }),
  new LineElement("line", frame, 5, false, "#000000", 0.5, [2, 1]),
  new SignatureElement("signature", frame, 6, false, "employee", true, "서명"),
];

describe("ElementFactory", () => {
  it.each(elements)("%s 요소를 JSON으로 변환한 뒤 같은 값으로 복원한다", (element) => {
    const serialized = ElementFactory.toJSON(element);
    const parsed: unknown = JSON.parse(JSON.stringify(serialized));

    const restored = ElementFactory.fromJSON(parsed as Record<string, unknown>);

    expect(restored).toEqual(element);
  });

  it("알 수 없는 요소 타입은 복원하지 않는다", () => {
    expect(() => ElementFactory.fromJSON({ type: "unknown" })).toThrow(
      "지원하지 않는 요소 타입이다",
    );
  });
});
