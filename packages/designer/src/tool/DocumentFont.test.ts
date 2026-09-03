import { describe, expect, it } from "vitest";
import { DocumentFont } from "./DocumentFont.js";

describe("DocumentFont", () => {
  it("문서가 선언한 첫 글꼴로 새 요소를 만든다", () => {
    expect(new DocumentFont(["MalgunGothic", "Pretendard"]).family()).toBe("MalgunGothic");
  });

  it("선언이 하나도 없어도 요소를 만들 수 있게 대체값을 준다", () => {
    expect(new DocumentFont([]).family()).toBe("Pretendard");
  });

  it("만든 글자 표현이 문서 글꼴을 쓴다", () => {
    const style = new DocumentFont(["MalgunGothic"]).style(9, { weight: 700 });
    expect(style.font).toBe("MalgunGothic");
    expect(style.size).toBe(9);
    expect(style.weight).toBe(700);
  });

  it("넘기지 않은 표현 속성은 기본값을 그대로 둔다", () => {
    const style = new DocumentFont(["MalgunGothic"]).style(9);
    expect(style.weight).toBe(400);
    expect(style.align).toBe("left");
  });
});
