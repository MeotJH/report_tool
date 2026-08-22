import {
  Binding,
  BoundTableSource,
  BoxElement,
  FieldElement,
  Frame,
  ImageElement,
  LineElement,
  SignatureElement,
  TableColumn,
  TableElement,
  TextElement,
  TextStyle,
} from "@report-tool/core";
import { describe, expect, it } from "vitest";
import { LayerNamer } from "./LayerNamer.js";

const frame = new Frame(10, 10, 40, 10);
const style = new TextStyle("Pretendard", 10);

describe("LayerNamer", () => {
  const namer = new LayerNamer();

  it("텍스트는 실제 문구를 이름으로 쓴다", () => {
    const element = new TextElement(
      "t", frame, 0, false, { kind: "literal", value: "급여명세서" }, style,
    );

    expect(namer.name(element)).toBe("급여명세서");
  });

  it("빈 문구는 종류 이름으로 대신한다", () => {
    const element = new TextElement(
      "t", frame, 0, false, { kind: "literal", value: "   " }, style,
    );

    expect(namer.name(element)).toBe("텍스트");
  });

  it("긴 문구는 목록 한 줄에 맞게 줄인다", () => {
    const element = new TextElement(
      "t", frame, 0, false,
      { kind: "literal", value: "가나다라마바사아자차카타파하가나다라마바사" }, style,
    );

    expect(namer.name(element)).toBe("가나다라마바사아자차카타파하가나다라…");
  });

  it("필드는 연결된 데이터 경로를 보여준다", () => {
    const element = new FieldElement("f", frame, 0, false, new Binding("pay.net"), style);

    expect(namer.name(element)).toBe("pay.net");
  });

  it("표는 열 수와 헤더를 함께 보여준다", () => {
    const element = new TableElement(
      "tb", frame, 0, false, new BoundTableSource(new Binding("items")),
      [new TableColumn("item", "항목", "{{row.item}}", 20, "left", null)],
      7, style, style, true, "clip",
    );

    expect(namer.name(element)).toBe("표 1열 항목");
  });

  it("출처가 없는 이미지는 상태를 이름으로 알린다", () => {
    const element = new ImageElement("i", frame, 0, false, { assetId: "" });

    expect(namer.name(element)).toBe("이미지 (출처 없음)");
  });

  it("채움 여부로 상자 종류를 구분한다", () => {
    expect(namer.name(new BoxElement("b", frame, 0, false))).toBe("테두리 상자");
    expect(namer.name(new BoxElement("b", frame, 0, false, { fill: "#fff" }))).toBe("채운 상자");
  });

  it("선은 방향을 알 수 있게 이름 붙인다", () => {
    const horizontal = new LineElement("l", new Frame(0, 0, 40, 0), 0, false, "#000", 0.3);
    const vertical = new LineElement("l", new Frame(0, 0, 0, 40), 0, false, "#000", 0.3);

    expect(namer.name(horizontal)).toBe("가로선");
    expect(namer.name(vertical)).toBe("세로선");
  });

  it("서명은 서명자를 먼저 보여준다", () => {
    const element = new SignatureElement("s", frame, 0, false, "employee");

    expect(namer.name(element)).toBe("서명 employee");
  });
});
