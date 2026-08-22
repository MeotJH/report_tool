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
import { StaticTableSource } from "./TableSource";
import { TextElement } from "./TextElement";

const frame = new Frame(10, 20, 30, 40);
const style = new TextStyle("Pretendard", 10);
const content: Content = { kind: "literal", value: "급여명세서" };

/** 공통 상태 규칙이 일곱 종류 전부에서 같은지 확인할 대표 인스턴스를 만든다. */
function createElements(): readonly Element[] {
  return [
    new TextElement("text", frame, 1, false, content, style),
    new FieldElement("field", frame, 1, false, new Binding("pay.net"), style),
    new TableElement(
      "table", frame, 1, false, new StaticTableSource([{ item: "기본급" }]),
      [new TableColumn("item", "항목", "{{row.item}}", 30, "left", null)],
      7, style, style, true, "clip",
    ),
    new ImageElement("image", frame, 1, false, { assetId: "logo" }),
    new BoxElement("box", frame, 1, false, { fill: "#eeeeee", strokeWidth: 0.3 }),
    new LineElement("line", frame, 1, false, "#333333", 0.3, [2, 2]),
    new SignatureElement("signature", frame, 1, false, "employee", true, "서명"),
  ];
}

describe("요소 공통 편집 상태", () => {
  it.each(createElements().map((element) => [element.type, element] as const))(
    "%s 요소가 z·잠금·숨김을 종류별 속성을 잃지 않고 교체한다",
    (_type, element) => {
      const changed = element.withZ(9).withLocked(true).withHidden(true);

      expect(changed.z).toBe(9);
      expect(changed.locked).toBe(true);
      expect(changed.hidden).toBe(true);
      expect(changed.id).toBe(element.id);
      expect(changed.type).toBe(element.type);
      expect(changed.toJSON()).toEqual(element.toJSON());
    },
  );

  it.each(createElements().map((element) => [element.type, element] as const))(
    "%s 요소의 배치 변경이 다른 공통 상태를 유지한다",
    (_type, element) => {
      const locked = element.withLocked(true).withHidden(true);
      const moved = locked.withFrame(new Frame(1, 2, 3, 4));

      expect(moved.frame).toEqual(new Frame(1, 2, 3, 4));
      expect(moved.locked).toBe(true);
      expect(moved.hidden).toBe(true);
    },
  );

  it("기본 생성 요소는 숨김 상태가 아니다", () => {
    for (const element of createElements()) {
      expect(element.hidden).toBe(false);
    }
  });

  it.each(createElements().map((element) => [element.type, element] as const))(
    "%s 요소의 숨김 상태가 JSON 왕복 후에도 남는다",
    (_type, element) => {
      const restored = ElementFactory.fromJSON(
        ElementFactory.toJSON(element.withHidden(true)),
      );

      expect(restored.hidden).toBe(true);
    },
  );

  it("hidden 필드가 없는 기존 저장 데이터는 보이는 상태로 복원한다", () => {
    const json = ElementFactory.toJSON(createElements()[0]!);
    delete json.hidden;

    expect(ElementFactory.fromJSON(json).hidden).toBe(false);
  });
});

describe("요소별 속성 변경", () => {
  it("텍스트가 문구와 스타일을 각각 독립적으로 교체한다", () => {
    const element = new TextElement("text", frame, 1, false, content, style);

    const renamed = element.withContent({ kind: "literal", value: "명세서" });
    const restyled = element.withStyle(new TextStyle("Pretendard", 20));

    expect(renamed.content).toEqual({ kind: "literal", value: "명세서" });
    expect(renamed.style).toBe(style);
    expect(restyled.style.size).toBe(20);
    expect(restyled.content).toBe(content);
  });

  it("필드가 바인딩만 교체하고 스타일을 유지한다", () => {
    const element = new FieldElement("field", frame, 1, false, new Binding("a.b"), style);

    const rebound = element.withBinding(new Binding("c.d"));

    expect(rebound.binding.path.toString()).toBe("c.d");
    expect(rebound.style).toBe(style);
  });

  it("상자가 전달하지 않은 표현 속성을 유지하고 명시한 제거만 반영한다", () => {
    const element = new BoxElement("box", frame, 1, false, {
      fill: "#ffffff", stroke: "#000000", strokeWidth: 0.5, radius: 2,
    });

    const changed = element.withAppearance({ fill: undefined, radius: 4 });

    expect(changed.fill).toBeUndefined();
    expect(changed.radius).toBe(4);
    expect(changed.stroke).toBe("#000000");
    expect(changed.strokeWidth).toBe(0.5);
  });

  it("선이 점선 해제를 유효한 변경으로 처리한다", () => {
    const element = new LineElement("line", frame, 1, false, "#333333", 0.3, [2, 2]);

    expect(element.withAppearance({ dash: undefined }).dash).toBeUndefined();
    expect(element.withAppearance({ strokeWidth: 1 }).dash).toEqual([2, 2]);
  });

  it("서명이 안내 문구 제거와 서명자 변경을 각각 처리한다", () => {
    const element = new SignatureElement("sign", frame, 1, false, "employee", true, "서명");

    expect(element.withSignature({ label: undefined }).label).toBeUndefined();
    expect(element.withSignature({ signer: "employer" }).label).toBe("서명");
  });

  it("이미지가 맞춤 방식만 바꿔도 단일 출처 규칙을 유지한다", () => {
    const element = new ImageElement("image", frame, 1, false, { assetId: "logo" });

    const changed = element.withFit("cover");

    expect(changed.fit).toBe("cover");
    expect(changed.assetId).toBe("logo");
    expect(() => element.withSource({ assetId: "a", binding: new Binding("b") }))
      .toThrow("이미지는 assetId 또는 binding 중 하나만 가져야 한다");
  });

  it("표가 헤더와 본문 글자 표현을 함께 교체한다", () => {
    const element = new TableElement(
      "table", frame, 1, false, new StaticTableSource([]),
      [new TableColumn("item", "항목", "{{row.item}}", 30, "left", null)],
      7, style, style, true, "clip",
    );

    const changed = element.withStyles({ cellStyle: new TextStyle("Pretendard", 8) });

    expect(changed.cellStyle.size).toBe(8);
    expect(changed.headerStyle).toBe(style);
    expect(changed.rowHeight).toBe(7);
  });
});
