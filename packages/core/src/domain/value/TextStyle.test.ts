import { describe, expect, it } from "vitest";
import { TextStyle } from "./TextStyle";

describe("TextStyle", () => {
  it("옵션이 없으면 안전한 기본 스타일을 사용한다", () => {
    const style = new TextStyle("Pretendard", 10);

    expect(style.weight).toBe(400);
    expect(style.italic).toBe(false);
    expect(style.color).toBe("#000000");
    expect(style.align).toBe("left");
    expect(style.valign).toBe("top");
    expect(style.lineHeight).toBe(1.4);
    expect(style.overflow).toBe("wrap");
  });

  it("글자 크기만 배율에 맞춰 변경한 새 스타일을 반환한다", () => {
    const original = new TextStyle("Pretendard", 10, {
      align: "center",
      weight: 700,
    });

    const scaled = original.scaledBy(0.8);

    expect(scaled.size).toBe(8);
    expect(scaled.align).toBe("center");
    expect(scaled.weight).toBe(700);
    expect(original.size).toBe(10);
  });
});
