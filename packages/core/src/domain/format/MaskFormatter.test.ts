import { describe, expect, it } from "vitest";
import { MaskFormatter } from "./MaskFormatter";

describe("MaskFormatter", () => {
  it("앞과 뒤의 지정한 문자만 남기고 중간을 가린다", () => {
    expect(new MaskFormatter(6, 1).format("9004171234567")).toBe(
      "900417******7",
    );
  });

  it("지정한 마스킹 문자를 사용한다", () => {
    expect(new MaskFormatter(2, 2, "#").format("12345678")).toBe("12####78");
  });
});
